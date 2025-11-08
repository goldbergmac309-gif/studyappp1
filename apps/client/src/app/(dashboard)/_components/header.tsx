// Structural placeholder for the persistent Header used by (dashboard)/layout.tsx
// Will be implemented in the next step according to BLUEPRINT v5.1
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Header() {
  const { user, actions } = useAuth()
  const router = useRouter()

  function handleLogout() {
    actions.logout()
    router.replace("/login")
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3 min-w-[44px]">
          <SidebarTrigger />
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-medium">
              S
            </div>
            <span className="font-medium tracking-tight hidden sm:block">Synapse OS</span>
          </Link>
        </div>
        {/* Global search moved out of header. Decommissioned header search input. */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-9">Start Session</Button>
          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5 hover:border-primary/90 text-xs h-9">Upgrade</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={""} alt={user?.email ?? "User"} />
                <AvatarFallback>{(user?.email?.charAt(0)?.toUpperCase() || "U") as string}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email?.split("@")[0] ?? "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard")}>Dashboard</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
