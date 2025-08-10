import { NextResponse } from "next/server"
import { searchCompanies as localSearch } from "@/lib/data"

type Enhet = {
  organisasjonsnummer?: string
  navn?: string
  naeringskode1?: { kode?: string; beskrivelse?: string }
  forretningsadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommune?: string
    kommunenummer?: string
    land?: string
  }
}

type Underenhet = {
  organisasjonsnummer?: string
  navn?: string
  naeringskode1?: { kode?: string; beskrivelse?: string }
  beliggenhetsadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommune?: string
    kommunenummer?: string
    land?: string
  }
}

type Result = { orgnr: string; name: string; industry: string; city: string; type?: "Enhet" | "Underenhet" }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const nace = (searchParams.get("nace") || searchParams.get("naeringskode") || "").trim()
  const kommune = (searchParams.get("kommune") || searchParams.get("kommunenummer") || "").trim()
  const city = (searchParams.get("city") || searchParams.get("poststed") || "").trim()
  const page = Number(searchParams.get("page") || "0")
  if (!q) return NextResponse.json({ results: [] })
  if (q.length < 2) return NextResponse.json({ results: [] })

  try {
    const digits = q.replace(/\D/g, "")

    // 1) Direct orgnr hit
    if (digits.length === 9 && isValidOrgnr(digits)) {
      const [enhetRes, underRes] = await Promise.allSettled([
        fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${digits}`, {
          headers: { accept: "application/json" },
          next: { revalidate: 300 },
        }),
        fetch(`https://data.brreg.no/enhetsregisteret/api/underenheter/${digits}`, {
          headers: { accept: "application/json" },
          next: { revalidate: 300 },
        }),
      ])

      if (enhetRes.status === "fulfilled" && enhetRes.value.ok) {
        const d: Enhet = await enhetRes.value.json()
        const item = mapEnhet(d)
        if (item) return NextResponse.json({ results: [item], source: "brreg" })
      }
      if (underRes.status === "fulfilled" && underRes.value.ok) {
        const d: Underenhet = await underRes.value.json()
        const item = mapUnderenhet(d)
        if (item) return NextResponse.json({ results: [item], source: "brreg" })
      }
    }

    // 2) Name search (enheter + underenheter)
    const enheterUrl = new URL("https://data.brreg.no/enhetsregisteret/api/enheter")
    enheterUrl.searchParams.set("size", "8")
    enheterUrl.searchParams.set("page", String(page))
    enheterUrl.searchParams.set("navn", q)

    const underUrl = new URL("https://data.brreg.no/enhetsregisteret/api/underenheter")
    underUrl.searchParams.set("size", "8")
    underUrl.searchParams.set("page", String(page))
    underUrl.searchParams.set("navn", q)

    const [enheterRes, underenheterRes] = await Promise.all([
      fetch(enheterUrl.toString(), { headers: { accept: "application/json" }, next: { revalidate: 300 } }),
      fetch(underUrl.toString(), { headers: { accept: "application/json" }, next: { revalidate: 300 } }),
    ])

    const enheterJson = enheterRes.ok ? await enheterRes.json() : {}
    const underJson = underenheterRes.ok ? await underenheterRes.json() : {}

    const enheter: Enhet[] = enheterJson?._embedded?.enheter ?? []
    const under: Underenhet[] = underJson?._embedded?.underenheter ?? []

    const mapped = [...enheter.map(mapEnhet), ...under.map(mapUnderenhet)].filter(Boolean) as Result[]
    const dedup = dedupe(mapped).slice(0, 8)

    if (dedup.length > 0) {
      return NextResponse.json({ results: dedup, source: "brreg" })
    }

    // 3) Guaranteed local fallback
    const fallback = localSearch(q).map((c) => ({
      orgnr: c.orgnr,
      name: c.name,
      industry: c.industry,
      city: c.city,
      type: "Enhet" as const,
    }))
    return NextResponse.json({ results: fallback, source: "local" })
  } catch {
    const fallback = localSearch(q).map((c) => ({
      orgnr: c.orgnr,
      name: c.name,
      industry: c.industry,
      city: c.city,
      type: "Enhet" as const,
    }))
    return NextResponse.json({ results: fallback, source: "local" })
  }
}

function mapEnhet(d: Enhet): Result | null {
  if (!d?.organisasjonsnummer || !d?.navn) return null
  const city = d.forretningsadresse?.poststed || d.forretningsadresse?.kommune || ""
  const industry = d.naeringskode1?.beskrivelse || d.naeringskode1?.kode || ""
  return { orgnr: String(d.organisasjonsnummer), name: d.navn, industry, city, type: "Enhet" }
}

function mapUnderenhet(d: Underenhet): Result | null {
  if (!d?.organisasjonsnummer || !d?.navn) return null
  const city = d.beliggenhetsadresse?.poststed || d.beliggenhetsadresse?.kommune || ""
  const industry = d.naeringskode1?.beskrivelse || d.naeringskode1?.kode || ""
  return { orgnr: String(d.organisasjonsnummer), name: d.navn, industry, city, type: "Underenhet" }
}

function dedupe(list: Result[]) {
  const seen = new Map<string, Result>()
  for (const item of list) {
    if (!seen.has(item.orgnr)) {
      seen.set(item.orgnr, item)
    } else {
      const prev = seen.get(item.orgnr)!
      if (prev.type !== "Enhet" && item.type === "Enhet") {
        seen.set(item.orgnr, item)
      }
    }
  }
  return Array.from(seen.values())
}

function normalizeNace(code: string) {
  const c = code.replace(/\s+/g, "")
  if (/^\d{4}$/.test(c)) return `${c.slice(0, 2)}.${c.slice(2)}`
  return c
}

function isValidOrgnr(orgnr: string) {
  if (!/^[0-9]{9}$/.test(orgnr)) return false
  const weights = [3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, w, i) => acc + Number(orgnr[i]) * w, 0)
  const remainder = sum % 11
  const ctrl = remainder === 0 ? 0 : 11 - remainder
  if (ctrl === 10) return false
  return ctrl === Number(orgnr[8])
}
