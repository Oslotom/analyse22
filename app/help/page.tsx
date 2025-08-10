"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HelpPage() {
  const [diag, setDiag] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/debug/brreg")
      const data = await res.json()
      setDiag(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Data sources and API</h1>
      <p className="mt-2 text-muted-foreground">
        Company and role information is from Enhetsregisteret. Financial statements (revenue, profit, equity, etc.) are
        from Regnskapsregisteret. If financials don&apos;t appear in this preview, it is likely due to CORS/network
        limits. Deploy to Vercel for server-to-server fetching.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connectivity diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? "Checking..." : "Run diagnostics"}
            </Button>
            {diag && (
              <div className="text-sm">
                <div className="font-medium">Note</div>
                <pre className="mt-1 whitespace-pre-wrap rounded border p-2 text-xs">
                  {JSON.stringify(diag, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              Enhetsregisteret docs:{" "}
              <a
                className="underline"
                href="https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html"
                target="_blank"
                rel="noreferrer"
              >
                data.brreg.no/enhetsregisteret/api/dokumentasjon
              </a>
            </div>
            <div>
              Enhetsregisteret bulk download (entities):{" "}
              <a
                className="underline"
                href="https://data.brreg.no/enhetsregisteret/api/enheter/lastned"
                target="_blank"
                rel="noreferrer"
              >
                /api/enheter/lastned
              </a>{" "}
              (metadata only; no revenue figures)
            </div>
            <div>
              Regnskapsregisteret API (financials):{" "}
              <a
                className="underline"
                href="https://data.brreg.no/regnskapsregisteret/api/regnskap?organisasjonsnummer=915933151"
                target="_blank"
                rel="noreferrer"
              >
                /regnskapsregisteret/api/regnskap
              </a>
            </div>
            <div className="mt-4">
              <Link href="/" className="inline-flex">
                <Button>Back to search</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
