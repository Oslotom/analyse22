import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/search-bar"
import { getCompanies } from "@/lib/data"
import { CompareBar } from "@/components/compare-bar"

export default async function HomePage() {
  const featured = getCompanies().slice(0, 4)

  return (
    <main className="min-h-[100svh]">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-semibold">
            Norwegian Business Reports
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/compare">
              <Button variant="outline">Compare</Button>
            </Link>
            <Link href="/help">
              <Button variant="outline">Help</Button>
            </Link>
            <a href="https://w2.brreg.no" target="_blank" rel="noreferrer">
              <Button variant="outline">Brønnøysund</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-semibold">Find Norwegian company insights</h1>
            <p className="mt-2 text-muted-foreground">
              Search by name or organization number. Get financials, BI summaries, contacts, news, and more.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-lg font-medium">Featured companies</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((c) => (
              <Card key={c.orgnr}>
                <CardHeader>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div>{c.industry}</div>
                  <div>Orgnr {c.orgnr}</div>
                  <Link href={`/company/${c.orgnr}`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      View report
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <CompareBar />
    </main>
  )
}
