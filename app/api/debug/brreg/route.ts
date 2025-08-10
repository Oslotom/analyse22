import { NextResponse } from "next/server"

export async function GET() {
  async function tryFetch(url: string) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } })
      const ok = res.ok
      return {
        url,
        ok,
        status: res.status,
        statusText: res.statusText,
      }
    } catch (e: any) {
      return {
        url,
        ok: false,
        status: 0,
        statusText: e?.message || "Network/CORS error",
      }
    }
  }

  const [enheter, regnskap] = await Promise.all([
    tryFetch("https://data.brreg.no/enhetsregisteret/api/enheter?size=1"),
    tryFetch("https://data.brreg.no/regnskapsregisteret/api/regnskap?size=1&organisasjonsnummer=915933151"),
  ])

  return NextResponse.json({
    note: "Revenue and financial metrics come from Regnskapsregisteret, not Enhetsregisteret. If regnskap is not ok here, deploy to Vercel so the server can fetch it.",
    enhetsregisteret: enheter,
    regnskapsregisteret: regnskap,
  })
}
