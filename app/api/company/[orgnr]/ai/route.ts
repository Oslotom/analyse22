import { NextResponse } from "next/server"
import { getCompanyByOrgnr } from "@/lib/data"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// This route uses AI SDK when OPENAI_API_KEY is configured; otherwise returns a deterministic fallback.
export async function GET(_req: Request, { params }: { params: { orgnr: string } }) {
  const c = getCompanyByOrgnr(params.orgnr)
  if (!c) return NextResponse.json({ summary: null })

  const last = c.financials.at(-1)!
  const prev = c.financials.at(-2) || last
  const growthPct = ((last.revenue - prev.revenue) / Math.max(1, prev.revenue)) * 100

  if (!process.env.OPENAI_API_KEY) {
    const fallback = {
      overview: `${c.name} (${c.orgForm}) operates in ${c.industry}. Recent revenue NOK ${(
        last.revenue / 1_000_000
      ).toFixed(1)}m with profit NOK ${(last.profit / 1_000_000).toFixed(1)}m. YoY growth ${(growthPct).toFixed(1)}%.`,
      swot: {
        strengths: ["Solid revenue growth", "Improving equity base", "Recognizable brand in Norway"],
        weaknesses: ["Margin volatility", "Concentration risk in core market"],
        opportunities: ["Strategic partnerships", "Product line expansion", "Export potential"],
        threats: ["Macro headwinds", "Regulatory changes", "Intensifying competition"],
      },
      recommendations: [
        "Focus on margin expansion via pricing and cost efficiency",
        "Diversify customer base and explore new segments",
        "Strengthen risk management and working capital discipline",
      ],
      risks: ["FX exposure", "Supply chain constraints", "Talent retention"],
    }
    return NextResponse.json({ summary: fallback })
  }

  const prompt = `
You are a professional equity and credit analyst. Produce a concise, board-ready business intelligence brief for the company below.

Company:
- Name: ${c.name}
- Orgnr: ${c.orgnr}
- Industry: ${c.industry}
- Organization form: ${c.orgForm}
- Founded: ${c.founded}
- City: ${c.city}
- Website: ${c.website ?? "N/A"}
- KPIs: marketShare=${c.kpis.marketShare ?? "n/a"}%, growthRate=${c.kpis.growthRate ?? "n/a"}%, riskScore=${c.kpis.riskScore ?? "n/a"}

Recent financials (NOK):
${c.financials
  .slice(-5)
  .map(
    (f) =>
      `Year ${f.year}: revenue=${f.revenue}, profit=${f.profit}, equity=${f.equity}, liabilities=${f.liabilities}, employees=${f.employees ?? "n/a"}`,
  )
  .join("\n")}

Return JSON with:
{
  "overview": string,
  "swot": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
  "recommendations": string[],
  "risks": string[]
}
Ensure short, specific bullets grounded in the numbers.
`

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: "You analyze Nordic private company statements and create concise, decision-grade insights.",
    prompt,
  })

  // Be tolerant if the LLM returns markdown code blocks.
  const jsonStart = text.indexOf("{")
  const jsonEnd = text.lastIndexOf("}")
  const body = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : "{}"

  try {
    const parsed = JSON.parse(body)
    return NextResponse.json({ summary: parsed })
  } catch {
    return NextResponse.json({
      summary: {
        overview: text.trim(),
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        recommendations: [],
        risks: [],
      },
    })
  }
}
