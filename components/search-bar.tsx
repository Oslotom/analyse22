"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCompanies } from "@/lib/data"

type Result = { orgnr: string; name: string; industry: string; city: string; type?: "Enhet" | "Underenhet" }

export function SearchBar({
  placeholder = "Search company name or organization number...",
  onSelect,
}: {
  placeholder?: string
  onSelect?: (result: Result) => void | Promise<void>
}) {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<Result[]>([])
  const [open, setOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState<number>(-1)
  const [showFilters, setShowFilters] = React.useState(false)
  const [nace, setNace] = React.useState("")
  const [kommune, setKommune] = React.useState("")
  const [city, setCity] = React.useState("")
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const interactingRef = React.useRef(false)
  const listboxId = "search-suggestions"
  const [hint, setHint] = React.useState<string | null>(null)

  // Debounced suggestions fetch (includes filters)
  React.useEffect(() => {
    const ctrl = new AbortController()
    const run = async () => {
      const query = q.trim()
      if (query.length < 2) {
        setResults([])
        setOpen(false)
        setActiveIdx(-1)
        setHint(null)
        return
      }
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query })
        if (nace) params.set("nace", nace)
        if (kommune) params.set("kommune", kommune)
        if (city) params.set("city", city)
        const res = await fetch(`/api/company/search?${params.toString()}`, { signal: ctrl.signal })
        const data = await res.json()
        setHint(data.source === "local" ? "Showing demo results (Brønnøysund unavailable in preview)" : null)
        const list: Result[] = data.results || []
        setResults(list)
        setOpen(list.length > 0)
        setActiveIdx(list.length > 0 ? 0 : -1)
      } catch {
        setHint("Showing demo results (offline)")
        // and compute local client-side fallback in case the API route itself is unavailable:
        try {
          // lightweight client fallback
          const local = getCompanies()
            .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.orgnr.includes(query))
            .slice(0, 8)
            .map((c) => ({ orgnr: c.orgnr, name: c.name, industry: c.industry, city: c.city }))
          setResults(local as any)
          setOpen(local.length > 0)
          setActiveIdx(local.length ? 0 : -1)
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(run, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, nace, kommune, city])

  // Close dropdown on outside click
  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const selectResult = React.useCallback(
    async (r: Result | undefined) => {
      if (!r) return
      try {
        await fetch(`/api/company/${r.orgnr}`, { cache: "no-store" }).catch(() => {})
        if (onSelect) await onSelect(r)
        router.push(`/company/${r.orgnr}`)
      } finally {
        setOpen(false)
      }
    },
    [onSelect, router],
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = results[activeIdx] ?? results[0]
    void selectResult(target)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      void selectResult(results[activeIdx] ?? results[0])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Auto-navigate on blur if input is a valid 9-digit orgnr
  const onBlur = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // Delay to allow click on a suggestion
      setTimeout(async () => {
        if (interactingRef.current) return
        const digits = q.replace(/\D/g, "")
        if (isValidOrgnr(digits)) {
          try {
            await fetch(`/api/company/${digits}`, { cache: "no-store" }).catch(() => {})
            router.push(`/company/${digits}`)
          } catch {
            // ignore
          }
        }
      }, 120)
    },
    [q, router],
  )

  return (
    <div className="relative w-full max-w-2xl" ref={wrapperRef}>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              placeholder={placeholder}
              className="h-12 pl-9 text-base"
              aria-label="Company search"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                open && activeIdx >= 0 && results[activeIdx] ? `option-${results[activeIdx].orgnr}` : undefined
              }
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />}
          </div>
          <Button
            type="button"
            variant={showFilters ? "secondary" : "outline"}
            className="h-12 gap-2"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            aria-controls="advanced-filters"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
          <Button type="submit" className="h-12">
            Search
          </Button>
        </div>

        {showFilters && (
          <Card id="advanced-filters" className="w-full">
            <div className="grid gap-3 p-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Industry code (NACE)</label>
                <Input
                  value={nace}
                  onChange={(e) => setNace(e.target.value)}
                  placeholder="e.g. 62.01 or 6201"
                  aria-label="Industry code"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Municipality no. (kommunenummer)</label>
                <Input
                  value={kommune}
                  onChange={(e) => setKommune(e.target.value)}
                  placeholder="e.g. 0301"
                  aria-label="Municipality number"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City (poststed)</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Oslo"
                  aria-label="City"
                />
              </div>
            </div>
          </Card>
        )}
      </form>

      {hint && (
        <div className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {hint}
        </div>
      )}

      {open && results.length > 0 && (
        <Card
          className="absolute z-20 mt-2 w-full overflow-hidden"
          role="listbox"
          id={listboxId}
          onMouseDown={() => {
            interactingRef.current = true
          }}
          onMouseUp={() => {
            // Reset after the click completes
            setTimeout(() => (interactingRef.current = false), 0)
          }}
        >
          <ul className="divide-y">
            {results.map((r, idx) => {
              const active = idx === activeIdx
              return (
                <li key={r.orgnr} id={`option-${r.orgnr}`} role="option" aria-selected={active}>
                  <button
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => void selectResult(r)}
                    className={`w-full px-4 py-3 text-left focus:outline-none ${
                      active ? "bg-accent" : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {r.name}
                          {r.type === "Underenhet" ? " (Underenhet)" : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {r.industry} • {r.city} • Orgnr {r.orgnr}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

// Client-side orgnr validation (Mod11)
function isValidOrgnr(orgnr: string) {
  if (!/^[0-9]{9}$/.test(orgnr)) return false
  const weights = [3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, w, i) => acc + Number(orgnr[i]) * w, 0)
  const remainder = sum % 11
  const ctrl = remainder === 0 ? 0 : 11 - remainder
  if (ctrl === 10) return false
  return ctrl === Number(orgnr[8])
}
