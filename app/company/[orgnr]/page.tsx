"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { CompanyOverview } from "@/components/company-overview"
import { Separator } from "@/components/ui/separator"

type CompanyResponse = {
  company?: {
    orgnr: string
    name: string
    industry: string
    orgForm: string
    founded: string
    address: string
    city: string
    website?: string
    registryLinks: { brreg: string; annualReport?: string }
    contacts: { name: string; role: string; email?: string; phone?: string }[]
    financials: {
      year: number
      revenue: number
      profit: number
      equity: number
      liabilities: number
      employees?: number
    }[]
    kpis: Record<string, any>
  }
  error?: string
}

export default function CompanyPage() {
  const { orgnr } = useParams<{ orgnr: string }>()
  const [data, setData] = React.useState<CompanyResponse["company"] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    const run = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/company/${orgnr}`, { cache: "no-store" })
        const json: CompanyResponse = await res.json()
        if (!active) return
        if (!res.ok || !json.company) {
          setError(json.error || "Company not found")
        } else {
          setData(json.company)
        }
      } catch {
        if (active) setError("Failed to load company")
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [orgnr])

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-80 rounded border" />
          <div className="h-80 rounded border" />
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="text-sm text-destructive">{error || "Company not found"}</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:underline">
          Home
        </a>{" "}
        / <span className="text-foreground">{data.name}</span>
      </nav>
      <CompanyOverview company={data as any} />
      <Separator className="my-8" />
      <footer className="text-xs text-muted-foreground">
        Company details and roles from Brønnøysund Enhetsregisteret. Financials are fetched from Regnskapsregisteret
        when available; synthetic trends are used only as fallback.
      </footer>
    </main>
  )
}
