"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, FileDown, LineChart, CopyPlus, Code2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookmarkButton } from "@/components/bookmark-button"
import { useCompare } from "@/lib/bookmarks"
import { RevenueProfitChart, BalanceSheetChart, GrowthEmployeesChart } from "@/components/charts/financial-charts"
import type { Company } from "@/lib/types"
import { exportSectionToPdf, exportFinancialsToCsv } from "@/utils/export"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type NewsItem = {
  id: string
  title: string
  source: string
  publishedAt: string
  url: string
  image: string
  excerpt?: string
}

export function CompanyOverview({
  company = {
    orgnr: "000000000",
    name: "Company",
    industry: "Industry",
    orgForm: "AS",
    founded: "2000-01-01",
    address: "Street 1",
    city: "Oslo",
    registryLinks: { brreg: "#" },
    contacts: [],
    financials: [],
    kpis: {},
    dataSources: { financials: null },
  },
}: {
  company?: Company
}) {
  const [news, setNews] = React.useState<NewsItem[]>([])
  const [ai, setAi] = React.useState<any>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const { has, toggle } = useCompare()
  const [rawOpen, setRawOpen] = React.useState(false)
  const [rawJson, setRawJson] = React.useState<any>(null)
  const [rawLoading, setRawLoading] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/company/${company.orgnr}/news`)
      const data = await res.json()
      setNews(data.news || [])
    }
    load()
  }, [company.orgnr])

  React.useEffect(() => {
    if (!rawOpen) return
    let active = true
    const run = async () => {
      setRawLoading(true)
      try {
        const res = await fetch(`/api/company/${company.orgnr}/financials/raw`)
        const data = await res.json()
        if (active) setRawJson(data)
      } catch {
        if (active) setRawJson({ error: "Failed to load raw financials" })
      } finally {
        if (active) setRawLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [rawOpen, company.orgnr])

  const generateAi = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch(`/api/company/${company.orgnr}/ai`)
      const data = await res.json()
      setAi(data.summary)
    } catch (e: any) {
      setAiError("Failed to generate AI summary.")
    } finally {
      setAiLoading(false)
    }
  }

  const isFallback = company.dataSources?.financials !== "regnskapsregisteret"

  return (
    <div className="space-y-6">
      {/* Info alert when financials are fallback */}
      {isFallback && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Live financials unavailable</AlertTitle>
          <AlertDescription>
            Revenue and other financials could not be loaded from Regnskapsregisteret in this environment. Data shown
            below are synthetic trends for demonstration. See the Help page diagnostics or deploy to Vercel to enable
            server-to-server fetching.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            Orgnr {company.orgnr} • {company.orgForm} • {company.industry} • {company.city}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {company.kpis.marketShare !== undefined && (
              <Badge variant="secondary">Market share {company.kpis.marketShare}%</Badge>
            )}
            {company.kpis.growthRate !== undefined && (
              <Badge variant="secondary">Growth {company.kpis.growthRate}%</Badge>
            )}
            {company.kpis.riskScore !== undefined && <Badge variant="secondary">Risk {company.kpis.riskScore}</Badge>}
            <Badge variant={company.dataSources?.financials === "regnskapsregisteret" ? "default" : "outline"}>
              Financials:{" "}
              {company.dataSources?.financials === "regnskapsregisteret" ? "Regnskapsregisteret" : "Fallback"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BookmarkButton orgnr={company.orgnr} />
          <Button
            variant={has(company.orgnr) ? "secondary" : "outline"}
            onClick={() => toggle(company.orgnr)}
            className="gap-2"
            aria-pressed={has(company.orgnr)}
          >
            <CopyPlus className="size-4" />
            <span>{has(company.orgnr) ? "Selected for Compare" : "Add to Compare"}</span>
          </Button>
          <Link href={company.registryLinks.brreg} target="_blank" className="inline-flex">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ExternalLink className="size-4" />
              <span>Brønnøysund</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top summary and export */}
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Business Intelligence Summary</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateAi} className="gap-2" disabled={aiLoading}>
              <LineChart className="size-4" />
              <span>{aiLoading ? "Generating..." : "Generate AI Insights"}</span>
            </Button>
            <Dialog open={rawOpen} onOpenChange={setRawOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Code2 className="size-4" />
                  <span>Raw financial JSON</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Raw financials from Regnskapsregisteret</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] rounded border p-3">
                  <pre className="whitespace-pre-wrap text-xs">
                    {rawLoading ? "Loading..." : JSON.stringify(rawJson, null, 2)}
                  </pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => exportSectionToPdf("export-section", `${company.name}-report.pdf`)}
            >
              <FileDown className="size-4" />
              <span>Export PDF</span>
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={() => exportFinancialsToCsv(company)}>
              <FileDown className="size-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent id="export-section" className="space-y-4">
          {!ai && !aiLoading && (
            <div className="text-sm text-muted-foreground">
              Click “Generate AI Insights” to create a concise, decision-grade brief including SWOT, market position,
              growth indicators, risks, and recommendations.
            </div>
          )}
          {aiError && <div className="text-sm text-destructive">{aiError}</div>}
          {ai && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-medium">Overview</h3>
                <p className="text-sm leading-relaxed">{ai.overview ?? ""}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Recommendations</h3>
                <ul className="list-disc pl-5 text-sm">
                  {(ai.recommendations ?? []).map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">SWOT</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium">Strengths</div>
                    <ul className="list-disc pl-5">
                      {(ai.swot?.strengths ?? []).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium">Weaknesses</div>
                    <ul className="list-disc pl-5">
                      {(ai.swot?.weaknesses ?? []).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium">Opportunities</div>
                    <ul className="list-disc pl-5">
                      {(ai.swot?.opportunities ?? []).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium">Threats</div>
                    <ul className="list-disc pl-5">
                      {(ai.swot?.threats ?? []).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Key Risks</h3>
                <ul className="list-disc pl-5 text-sm">
                  {(ai.risks ?? []).map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <RevenueProfitChart data={company.financials} />
        <BalanceSheetChart data={company.financials} />
        <GrowthEmployeesChart data={company.financials} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            Company details and roles from{" "}
            <a
              className="underline"
              href={`https://data.brreg.no/enhetsregisteret/api/enheter/${company.orgnr}`}
              target="_blank"
              rel="noreferrer"
            >
              Enhetsregisteret
            </a>{" "}
            and{" "}
            <a
              className="underline"
              href={`https://data.brreg.no/enhetsregisteret/api/enheter/${company.orgnr}/roller`}
              target="_blank"
              rel="noreferrer"
            >
              roller
            </a>
            .
          </div>
          <div>
            Financial statements from{" "}
            <a
              className="underline"
              href={`https://data.brreg.no/regnskapsregisteret/api/regnskap?organisasjonsnummer=${company.orgnr}`}
              target="_blank"
              rel="noreferrer"
            >
              Regnskapsregisteret API
            </a>{" "}
            (when available).
          </div>
        </CardContent>
      </Card>

      {/* Contacts and news ... unchanged */}
    </div>
  )
}
