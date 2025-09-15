"use client"

import { useEffect, useState } from "react"

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile("matches" in e ? e.matches : (e as MediaQueryList).matches)
    }
    // set initial
    handler(mql)
    // add listener
    if ("addEventListener" in mql) {
      mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void)
      return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void)
    } else {
      // Safari
      // @ts-ignore
      mql.addListener(handler)
      return () => {
        // @ts-ignore
        mql.removeListener(handler)
      }
    }
  }, [breakpoint])

  return isMobile
}
