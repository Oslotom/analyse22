"use client"

import { useRouter } from "next/navigation"
import { ArrowUpWideNarrowIcon as ArrowsHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCompare } from "@/lib/bookmarks"

export function CompareBar() {
  const { compare, clear } = useCompare()
  const router = useRouter()

  if (compare.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm">{compare.length} selected for comparison. You can select up to 4.</div>
            <div className="flex items-center gap-2">
              <Button onClick={() => router.push(`/compare?ids=${compare.join(",")}`)} className="gap-2">
                <ArrowsHorizontal className="size-4" />
                <span>Compare</span>
              </Button>
              <Button variant="ghost" onClick={clear} aria-label="Clear compare list">
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
