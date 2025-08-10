import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: { orgnr: string } }) {
  const orgnr = params.orgnr?.replace(/\D/g, "")
  if (!orgnr) return NextResponse.json({ error: "Invalid orgnr" }, { status: 400 })

  try {
    const url = new URL("https://data.brreg.no/regnskapsregisteret/api/regnskap")
    url.searchParams.set("organisasjonsnummer", orgnr)
    url.searchParams.set("size", "100")

    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch raw financials" }, { status: 500 })
  }
}
