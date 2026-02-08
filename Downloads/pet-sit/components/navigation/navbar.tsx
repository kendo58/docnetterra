"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Home,
  Heart,
  User,
  PlusCircle,
  Flame,
  Search,
  LogOut,
  Calendar,
  List,
  MessageCircle,
} from "lucide-react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { NotificationBell } from "@/components/features/notification-bell"
import { MessageNotificationBell } from "@/components/features/message-notification-bell"
import { MobileMessageBadge } from "@/components/features/mobile-message-badge"
import { ThemeToggle } from "@/components/navigation/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => pathname === path

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-around px-4 md:justify-between">
        <BrandLogo size="md" className="hidden md:flex" />

        {/* Mobile Navigation */}
        <div className="flex w-full items-center justify-around md:hidden">
          <Link href="/dashboard">
            <Button
              variant={isActive("/dashboard") ? "default" : "ghost"}
              size="sm"
              className="flex-col gap-1 h-auto py-2"
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Explore</span>
            </Button>
          </Link>

          <Link href="/swipe">
            <Button variant={isActive("/swipe") ? "default" : "ghost"} size="sm" className="flex-col gap-1 h-auto py-2">
              <Flame className="h-5 w-5" />
              <span className="text-xs">Swipe</span>
            </Button>
          </Link>

          <Link href="/matches">
            <Button
              variant={isActive("/matches") ? "default" : "ghost"}
              size="sm"
              className="flex-col gap-1 h-auto py-2"
            >
              <Heart className="h-5 w-5" />
              <span className="text-xs">Matches</span>
            </Button>
          </Link>

          <Link href="/messages">
            <Button
              variant={isActive("/messages") || pathname?.startsWith("/messages") ? "default" : "ghost"}
              size="sm"
              className="flex-col gap-1 h-auto py-2 relative"
            >
              <div className="relative">
                <MessageCircle className="h-5 w-5" />
                <MobileMessageBadge />
              </div>
              <span className="text-xs">Messages</span>
            </Button>
          </Link>

          <Link href="/profile">
            <Button
              variant={isActive("/profile") ? "default" : "ghost"}
              size="sm"
              className="flex-col gap-1 h-auto py-2"
            >
              <User className="h-5 w-5" />
              <span className="text-xs">Profile</span>
            </Button>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/dashboard">
            <Button variant={isActive("/dashboard") ? "default" : "ghost"}>Explore</Button>
          </Link>
          <Link href="/search">
            <Button variant={isActive("/search") ? "default" : "ghost"}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </Link>
          <Link href="/listings">
            <Button variant={isActive("/listings") ? "default" : "ghost"}>
              <List className="mr-2 h-4 w-4" />
              My Listings
            </Button>
          </Link>
          <Link href="/sits">
            <Button variant={isActive("/sits") ? "default" : "ghost"}>
              <Calendar className="mr-2 h-4 w-4" />
              Sits
            </Button>
          </Link>
          <Link href="/swipe">
            <Button variant={isActive("/swipe") ? "default" : "ghost"}>Swipe</Button>
          </Link>
          <Link href="/matches">
            <Button variant={isActive("/matches") ? "default" : "ghost"}>Matches</Button>
          </Link>
          <MessageNotificationBell />
          <Link href="/listings/new">
            <Button variant="default">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Listing
            </Button>
          </Link>
          <NotificationBell />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={isActive("/profile") ? "default" : "ghost"} size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/profile/edit">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/listings">
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" />
                  My Listings
                </DropdownMenuItem>
              </Link>
              <Link href="/sits">
                <DropdownMenuItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  Sits
                </DropdownMenuItem>
              </Link>
              <Link href="/availability">
                <DropdownMenuItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Availability
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
