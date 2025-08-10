"use client"

import * as React from "react"

const BOOKMARKS_KEY = "nbr:bookmarks"
const COMPARE_KEY = "nbr:compare"

export function useBookmarks() {
  const [bookmarks, setBookmarks] = React.useState<string[]>([])

  React.useEffect(() => {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    setBookmarks(raw ? JSON.parse(raw) : [])
  }, [])

  const toggle = React.useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isBookmarked = React.useCallback((id: string) => bookmarks.includes(id), [bookmarks])

  return { bookmarks, toggle, isBookmarked }
}

export function useCompare() {
  const [compare, setCompare] = React.useState<string[]>([])

  React.useEffect(() => {
    const raw = localStorage.getItem(COMPARE_KEY)
    setCompare(raw ? JSON.parse(raw) : [])
  }, [])

  const toggle = React.useCallback((id: string) => {
    setCompare((prev) => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id)
      } else {
        // limit comparison to max 4
        next = [...prev, id].slice(-4)
      }
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clear = React.useCallback(() => {
    setCompare([])
    localStorage.setItem(COMPARE_KEY, JSON.stringify([]))
  }, [])

  const has = React.useCallback((id: string) => compare.includes(id), [compare])

  return { compare, toggle, clear, has }
}
