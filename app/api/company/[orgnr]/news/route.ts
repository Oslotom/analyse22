import { NextResponse } from "next/server"
import { getCompanyByOrgnr } from "@/lib/data"

export async function GET(_req: Request, { params }: { params: { orgnr: string } }) {
  const c = getCompanyByOrgnr(params.orgnr)
  if (!c) return NextResponse.json({ news: [] })

  // Stubbed news. Integrate your preferred source (e.g., web search, RSS, or news API) here.
  const news = [
    {
      id: `${c.orgnr}-1`,
      title: `${c.name} announces Q2 results with steady growth`,
      source: "Finansavisen",
      publishedAt: new Date().toISOString(),
      url: "https://example.com/news/1",
      image: "/norway-business-news-q2.png",
      excerpt: "The company reported improved margins and continued revenue growth driven by core business lines.",
    },
    {
      id: `${c.orgnr}-2`,
      title: `${c.name} signs strategic partnership in ${c.industry}`,
      source: "E24",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      url: "https://example.com/news/2",
      image: "/norway-strategic-partnership.png",
      excerpt: "A new partnership aims to strengthen the company's market position and accelerate innovation.",
    },
  ]
  return NextResponse.json({ news })
}
