"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueProfitChart } from "@/components/charts/financial-charts"

type CompanyResp = {
  company: {
    orgnr: string
    name: string
    industry: string
    financials: { year: number; revenue: number; profit: number; equity: number; liabilities: number }[]
  }
}

export default function ComparePage() {
  const sp = useSearchParams()
  const ids = (sp.get("ids") || "").split(",").filter(Boolean).slice(0, 4)
  const [companies, setCompanies] = React.useState<CompanyResp["company"][]>([])

  React.useEffect(() => {
    const run = async () => {
      const list: CompanyResp["company"][] = []
      for (const id of ids) {
        const res = await fetch(`/api/company/${id}`)
        if (res.ok) {
          const data: CompanyResp = await res.json()
          list.push(data.company)
        }
      }
      setCompanies(list)
    }
    run()
  }, [ids.join(",")])

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Compare companies</h1>
      {companies.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No companies selected. Go to a company page and click “Add to Compare”.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((c) => (
            <Card key={c.orgnr}>
              <CardHeader>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {c.industry} • Orgnr {c.orgnr}
                </div>
              </CardHeader>
              <CardContent>
                <RevenueProfitChart data={c.financials as any} title="Revenue vs Profit" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
