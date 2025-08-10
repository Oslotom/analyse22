import { NextResponse } from "next/server"
import { seedFinancials } from "@/lib/data"
import type { Company, ContactPerson, FinancialYear } from "@/lib/types"

type BrregEnhet = {
  organisasjonsnummer?: string
  navn?: string
  organisasjonsform?: { kode?: string; beskrivelse?: string }
  stiftelsesdato?: string
  registreringsdatoEnhetsregisteret?: string
  naeringskode1?: { kode?: string; beskrivelse?: string }
  forretningsadresse?: {
    adresse?: string[]
    postnummer?: string
    poststed?: string
    kommune?: string
    kommunenummer?: string
    land?: string
  }
  hjemmeside?: string
  antallAnsatte?: number
}

type BrregRoller = {
  rollegrupper?: {
    type?: string
    roller?: {
      type?: string
      person?: {
        navn?: string
        fodselsdato?: string
        etternavn?: string
        fornavn?: string
        mellomnavn?: string
      }
      enhet?: {
        organisasjonsnummer?: string
        navn?: string
      }
    }[]
  }[]
}

export async function GET(_req: Request, { params }: { params: { orgnr: string } }) {
  const orgnr = params.orgnr?.replace(/\D/g, "")
  if (!orgnr) return NextResponse.json({ error: "Invalid orgnr" }, { status: 400 })

  // 1) Core unit info
  const enhetRes = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 3600 },
  })
  if (!enhetRes.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const enhet: BrregEnhet = await enhetRes.json()

  // 2) Roles / contacts
  let contacts: ContactPerson[] = []
  try {
    const rolesRes = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}/roller`, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    })
    if (rolesRes.ok) {
      const roles: BrregRoller = await rolesRes.json()
      contacts = extractContacts(roles)
    }
  } catch {
    // ignore roles errors
  }

  // 3) Financials (try Regnskapsregisteret, then fallback)
  let financials: FinancialYear[] = []
  let financialsSource: "regnskapsregisteret" | "fallback" = "fallback"
  try {
    financials = await fetchFinancialsFromBrreg(orgnr)
    financialsSource = "regnskapsregisteret"
  } catch {
    financials = seedFinancials()
    financialsSource = "fallback"
  }

  // 4) Map to our Company model
  const addrParts = enhet.forretningsadresse?.adresse ?? []
  const addressLine = addrParts.length ? addrParts.join(", ") : ""
  const city = enhet.forretningsadresse?.poststed || enhet.forretningsadresse?.kommune || ""

  const company: Company = {
    orgnr,
    name: enhet.navn || orgnr,
    industry: enhet.naeringskode1?.beskrivelse || enhet.naeringskode1?.kode || "N/A",
    orgForm: enhet.organisasjonsform?.kode || enhet.organisasjonsform?.beskrivelse || "N/A",
    founded: enhet.stiftelsesdato || enhet.registreringsdatoEnhetsregisteret || "",
    address: addressLine || city || "",
    city,
    country: enhet.forretningsadresse?.land,
    website: enhet.hjemmeside,
    registryLinks: {
      brreg: `https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=${orgnr}`,
      annualReport: undefined,
    },
    contacts,
    financials,
    kpis: {
      // Can be derived later from financials (e.g., CAGR, leverage, Altman Z, etc.)
      marketShare: undefined,
      growthRate: undefined,
      riskScore: undefined,
    },
    dataSources: { financials: financialsSource },
  }

  return NextResponse.json({ company })
}

function extractContacts(data: BrregRoller): ContactPerson[] {
  const out: ContactPerson[] = []
  for (const group of data.rollegrupper ?? []) {
    for (const role of group.roller ?? []) {
      const roleName = role.type || group.type || "Role"
      // Person roles
      if (role.person) {
        const full =
          role.person.navn ||
          [role.person.fornavn, role.person.mellomnavn, role.person.etternavn].filter(Boolean).join(" ").trim()
        if (full) out.push({ name: full, role: normalizeRole(roleName) })
      }
      // Entity roles (companies) — include as contact entries as well
      if (role.enhet?.navn && role.enhet.organisasjonsnummer) {
        out.push({ name: `${role.enhet.navn} (${role.enhet.organisasjonsnummer})`, role: normalizeRole(roleName) })
      }
    }
  }
  // De-duplicate by name+role
  const seen = new Set<string>()
  return out.filter((c) => {
    const key = `${c.name}|${c.role}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeRole(r: string) {
  const up = r.toUpperCase()
  if (up.includes("DAGLIG")) return "CEO"
  if (up.includes("STYRELEDER")) return "Chair"
  if (up.includes("STYREMEDLEM")) return "Board Member"
  if (up.includes("REGNSKAP")) return "Accounting Contact"
  if (up.includes("REVISOR")) return "Auditor"
  return r
}

/**
 * Fetch financials from Brønnøysund Regnskapsregisteret.
 * The API schemas vary; this mapper searches nested keys and
 * extracts best-effort values for revenue, profit, equity, liabilities, employees.
 */
async function fetchFinancialsFromBrreg(orgnr: string): Promise<FinancialYear[]> {
  const url = new URL("https://data.brreg.no/regnskapsregisteret/api/regnskap")
  url.searchParams.set("organisasjonsnummer", orgnr)
  url.searchParams.set("size", "100")
  // Optional: filter by latest years or sort desc if supported by API
  url.searchParams.set("page", "0")

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json, application/vnd.brreg.regnskap.v1+json",
    },
    next: { revalidate: 60 * 60 * 24 }, // cache 24h
  })
  if (!res.ok) throw new Error("regnskap fetch failed")
  const json: any = await res.json()

  // Try multiple shapes: array at top-level OR under _embedded
  const items: any[] =
    (json?._embedded?.regnskap as any[]) ??
    (json?._embedded?.regnskaper as any[]) ??
    (json?.regnskap as any[]) ??
    (json?.items as any[]) ??
    (Array.isArray(json) ? json : [])

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("no regnskap items")
  }

  // Map each filing to a simple yearly snapshot
  const byYear = new Map<number, FinancialYear>()

  for (const it of items) {
    const year = extractYear(it)
    if (!year) continue

    const revenue =
      pickAmount(it, [
        /sum.?driftsinntekter/i,
        /driftsinntekter?/i,
        /salgsinntekter?/i,
        /omsetning/i,
        /netto.?omsetning/i,
      ]) ?? 0
    const profit =
      pickAmount(it, [
        /årsresultat|arsresultat/i,
        /resultat.?etter.?skatt/i,
        /ordinært.?resultat/i,
        /resultat(?!regnskap)/i,
      ]) ?? 0
    const equity = pickAmount(it, [/sum.?egenkapital/i, /egenkapital/i]) ?? 0
    const totalEqDebt = pickAmount(it, [/sum.?egenkapital.?og.?gjeld/i, /egenkapital.?og.?gjeld/i])
    const liabilitiesDirect = pickAmount(it, [/sum.?gjeld/i, /gjeld/i])
    const liabilities =
      typeof liabilitiesDirect === "number"
        ? liabilitiesDirect
        : typeof totalEqDebt === "number" && typeof equity === "number"
          ? Math.max(0, totalEqDebt - equity)
          : 0

    const employeesRaw =
      getNested(it, ["antallAnsatte"]) ?? pickAmount(it, [/antall.?ansatte/i, /ansatte/i]) ?? undefined
    const employees = typeof employeesRaw === "number" ? Math.round(employeesRaw) : undefined

    const cur = byYear.get(year)
    const next: FinancialYear = {
      year,
      revenue: chooseBetterNumber(cur?.revenue, revenue),
      profit: chooseBetterNumber(cur?.profit, profit),
      equity: chooseBetterNumber(cur?.equity, equity),
      liabilities: chooseBetterNumber(cur?.liabilities, liabilities),
      employees: employees ?? cur?.employees,
      ebitda: undefined,
    }
    byYear.set(year, next)
  }

  let years = Array.from(byYear.values()).sort((a, b) => a.year - b.year)

  const hasSignal = years.some((y) => (y.revenue ?? 0) !== 0 || (y.profit ?? 0) !== 0 || (y.equity ?? 0) !== 0)
  if (!hasSignal) throw new Error("empty regnskap values")

  // If everything is zero or empty, fallback

  // Keep last 6 years for charts
  years = years.slice(-6)

  // Basic cleanup: ensure non-negative equity/liabilities if missing
  years = years.map((y) => ({
    ...y,
    revenue: Math.max(0, Math.round(y.revenue ?? 0)),
    profit: Math.round(y.profit ?? 0),
    equity: Math.max(0, Math.round(y.equity ?? 0)),
    liabilities: Math.max(0, Math.round(y.liabilities ?? 0)),
  }))

  return years
}

function chooseBetterNumber(a: number | undefined, b: number | undefined) {
  // Prefer a non-zero number; otherwise take the other
  const av = typeof a === "number" ? a : 0
  const bv = typeof b === "number" ? b : 0
  return Math.abs(bv) > Math.abs(av) ? bv : av
}

function extractYear(obj: any): number | undefined {
  // Look for common year fields
  const direct = getNested(obj, ["år", "ar", "regnskapsår", "regnskapsaar", "regnskapsAr"])
  if (isYear(direct)) return Number(direct)

  // regnskapsperiode with from/to dates
  const period = getNested(obj, ["regnskapsperiode"]) || getNested(obj, ["periode"])
  if (period) {
    const toDate =
      getNested(period, ["tom"]) ||
      getNested(period, ["tilDato"]) ||
      getNested(period, ["til"]) ||
      getNested(period, ["to"])
    const fromDate =
      getNested(period, ["fom"]) ||
      getNested(period, ["fraDato"]) ||
      getNested(period, ["fra"]) ||
      getNested(period, ["from"])
    const yTo = parseYearFromDate(toDate)
    const yFrom = parseYearFromDate(fromDate)
    return yTo || yFrom
  }

  // Fallback: scan keys named "*ar" or '*år'
  const year = scanForYear(obj)
  return year
}

function isYear(v: any): v is number | string {
  const n = Number(v)
  return Number.isFinite(n) && n > 1900 && n < 3000
}
function parseYearFromDate(v: any): number | undefined {
  if (!v) return undefined
  const m = String(v).match(/(19|20)\d{2}/)
  return m ? Number(m[0]) : undefined
}
function scanForYear(obj: any, depth = 0): number | undefined {
  if (!obj || depth > 4) return undefined
  for (const [k, v] of Object.entries(obj)) {
    if (/(^|[^a-z])(ar|år)\b/i.test(k) && isYear(v)) return Number(v as any)
    if (typeof v === "object") {
      const y = scanForYear(v, depth + 1)
      if (y) return y
    }
  }
  return undefined
}

function getNested(obj: any, path: (string | number)[]): any {
  let cur = obj
  for (const key of path) {
    if (cur == null) return undefined
    cur = cur[String(key)]
  }
  return cur
}

/**
 * Recursively search object for a numeric value whose key matches any of the provided patterns.
 * Returns the first match found (depth-first).
 */
function pickAmount(obj: any, patterns: RegExp[], depth = 0): number | undefined {
  if (!obj || depth > 6) return undefined

  for (const [key, value] of Object.entries(obj)) {
    if (patterns.some((re) => re.test(key))) {
      const num = toNumber(value)
      if (Number.isFinite(num)) return num
    }
    if (value && typeof value === "object") {
      const nested = pickAmount(value, patterns, depth + 1)
      if (Number.isFinite(nested as number)) return nested
    }
  }
  return undefined
}

function toNumber(v: any): number | undefined {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const s = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}
