"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import api from "@/lib/api"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { toast } from "sonner"

type Subject = { id: string; name: string }

export function CommandPalette() {
  const router = useRouter()
  const { token, actions } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [loadingSubjects, setLoadingSubjects] = React.useState(false)
  const [subjects, setSubjects] = React.useState<Subject[]>([])

  // Global shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [])

  // Load subjects on open when authenticated
  React.useEffect(() => {
    if (!open || !token) return
    let cancelled = false
    async function load() {
      try {
        setLoadingSubjects(true)
        const res = await api.get<Subject[]>("/subjects")
        if (!cancelled) setSubjects(res.data)
      } catch {
        // Do not toast for 401; user might be on login page
      } finally {
        if (!cancelled) setLoadingSubjects(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, token])

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  function logout() {
    setOpen(false)
    actions.logout()
    toast("Signed out")
    router.replace("/login")
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}>Go to Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/login")}>Login</CommandItem>
          <CommandItem onSelect={() => go("/signup")}>Signup</CommandItem>
        </CommandGroup>
        {token ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Subjects">
              {loadingSubjects && <CommandItem disabled>Loading subjects…</CommandItem>}
              {!loadingSubjects && subjects.length === 0 && (
                <CommandItem disabled>No subjects yet</CommandItem>
              )}
              {subjects.map((s) => (
                <CommandItem key={s.id} onSelect={() => go(`/subjects/${s.id}`)}>
                  {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Session">
              <CommandItem onSelect={logout}>Log out</CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
