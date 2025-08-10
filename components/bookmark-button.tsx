"use client"

import { Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookmarks } from "@/lib/bookmarks"

export function BookmarkButton({ orgnr }: { orgnr: string }) {
  const { isBookmarked, toggle } = useBookmarks()
  const active = isBookmarked(orgnr)

  return (
    <Button
      variant={active ? "secondary" : "outline"}
      onClick={() => toggle(orgnr)}
      className="gap-2"
      aria-pressed={active}
      aria-label={active ? "Remove bookmark" : "Add bookmark"}
    >
      {active ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      <span>{active ? "Bookmarked" : "Bookmark"}</span>
    </Button>
  )
}
