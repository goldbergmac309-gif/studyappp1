"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

// Minimal, composable sidebar primitives inspired by the reference project
// Provides: SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarFooter,
// SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
// SidebarMenuButton, SidebarSeparator, SidebarTrigger, SidebarRail, useSidebar

const SIDEBAR_LOCALSTORAGE_KEY = "sidebar:state"
const WIDTH_EXPANDED = "272px"
const WIDTH_ICON = "72px"

type SidebarState = "expanded" | "collapsed"

export type SidebarContext = {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

export function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
  return ctx
}

export const SidebarProvider = ({ children, defaultOpen = true }: { children: React.ReactNode; defaultOpen?: boolean }) => {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(defaultOpen)

  React.useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(SIDEBAR_LOCALSTORAGE_KEY) : null
      if (raw === "collapsed") setOpen(false)
    } catch {}
  }, [])

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_LOCALSTORAGE_KEY, open ? "expanded" : "collapsed")
      }
    } catch {}
  }, [open])

  // On mobile, keep sidebar closed by default and when switching to mobile
  React.useEffect(() => {
    if (isMobile && open) setOpen(false)
  }, [isMobile, open])

  const toggleSidebar = React.useCallback(() => setOpen((v) => !v), [])
  const state: SidebarState = open ? "expanded" : "collapsed"

  const value: SidebarContext = React.useMemo(
    () => ({ state, open, setOpen, isMobile, toggleSidebar }),
    [state, open, isMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}

export const Sidebar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: "left" | "right" }>(
  ({ className, children, side = "left", ...props }, ref) => {
    const { state, isMobile, open, setOpen } = useSidebar()

    // Mobile: render an off-canvas sheet with backdrop
    if (isMobile) {
      return (
        <div ref={ref} data-side={side} className={cn("text-sidebar-foreground", className)} {...props}>
          {/* Backdrop */}
          {open && (
            <div
              aria-hidden
              className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
          )}
          {/* Sheet panel */}
          <div
            className={cn(
              "fixed inset-y-0 z-40 flex h-svh w-[272px] bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out",
              side === "left" ? (open ? "translate-x-0 left-0" : "-translate-x-full left-0") : (open ? "translate-x-0 right-0" : "translate-x-full right-0")
            )}
          >
            <div className="flex h-full w-full flex-col">{children}</div>
          </div>
        </div>
      )
    }

    // Desktop: spacer + fixed content
    return (
      <div
        ref={ref}
        data-state={state}
        data-side={side}
        className={cn("group peer hidden md:block text-sidebar-foreground", className)}
        {...props}
      >
        {/* spacer to create gap in layout when using flex/grid around */}
        <div
          className={cn(
            "relative h-svh bg-transparent transition-[width] duration-200 ease-linear",
          )}
          style={{ width: state === "expanded" ? WIDTH_EXPANDED : WIDTH_ICON }}
        />
        {/* fixed content */}
        <div
          className={cn(
            "fixed inset-y-0 z-10 hidden md:flex h-svh transition-[width,left,right] duration-200 ease-linear",
            side === "left" ? "left-0 border-r border-sidebar-border" : "right-0 border-l border-sidebar-border",
            "bg-sidebar"
          )}
          style={{ width: state === "expanded" ? WIDTH_EXPANDED : WIDTH_ICON }}
        >
          <div className="flex h-full w-full flex-col">
            {children}
          </div>
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

export const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn("relative flex min-h-svh flex-1 flex-col bg-background", className)}
        {...props}
      />
    )
  }
)
SidebarInset.displayName = "SidebarInset"

export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-h-0 flex-1 flex-col overflow-auto", className)} {...props} />
  )
)
SidebarContent.displayName = "SidebarContent"

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 p-2", className)} {...props} />
  )
)
SidebarHeader.displayName = "SidebarHeader"

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 p-2 mt-auto", className)} {...props} />
  )
)
SidebarFooter.displayName = "SidebarFooter"

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
  )
)
SidebarGroup.displayName = "SidebarGroup"

export const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-8 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70", className)} {...props} />
  )
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full text-sm", className)} {...props} />
  )
)
SidebarGroupContent.displayName = "SidebarGroupContent"

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />
  )
)
SidebarMenu.displayName = "SidebarMenu"

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("group/menu-item relative", className)} {...props} />
  )
)
SidebarMenuItem.displayName = "SidebarMenuItem"

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }
>(({ className, isActive, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

export const SidebarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mx-2 h-px bg-sidebar-border", className)} {...props} />
  )
)
SidebarSeparator.displayName = "SidebarSeparator"

export const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentProps<typeof Button>>(
  ({ className, onClick, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", className)}
        onClick={(e) => {
          onClick?.(e)
          toggleSidebar()
        }}
        {...props}
      >
        <PanelLeft className="h-4 w-4" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    )
  }
)
SidebarTrigger.displayName = "SidebarTrigger"

export const SidebarRail = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()
    return (
      <button
        ref={ref}
        aria-label="Toggle Sidebar Rail"
        tabIndex={-1}
        onClick={toggleSidebar}
        className={cn(
          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarRail.displayName = "SidebarRail"
