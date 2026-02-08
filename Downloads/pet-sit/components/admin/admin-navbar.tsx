"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  MessageSquareWarning,
  Calendar,
  Home,
  LogOut,
  Shield,
  ShieldCheck,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createBrowserClient } from "@/lib/supabase/client"

export function AdminNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    const loadRole = async () => {
      try {
        const supabase = createBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle()
        setRole(data?.role ?? null)
      } catch (error) {
        console.error("[sitswap] Failed to load admin role:", error)
      }
    }

    loadRole()
  }, [])

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  const navItems = useMemo(() => {
    const items = [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareWarning },
      { href: "/admin/sits", label: "Sits", icon: Calendar },
      { href: "/admin/listings", label: "Listings", icon: Home },
    ]

    if (role === "super_admin") {
      items.push({ href: "/admin/admins", label: "Admins", icon: ShieldCheck })
    }

    return items
  }, [role])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-700 bg-slate-900 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">SitSwap Admin</span>
            <div className="text-xs text-slate-400">Trust & Safety Portal</div>
          </div>
        </Link>

        {/* Navigation */}
        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  size="sm"
                  className={
                    isActive(item.href)
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
                <Users className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem asChild>
                <Link href="/" className="text-slate-200 hover:text-white">
                  View User Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
