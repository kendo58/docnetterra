"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  items?: BreadcrumbItem[]
  showHome?: boolean
}

export function BreadcrumbNav({ items, showHome = true }: BreadcrumbNavProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items

    const segments = pathname.split("/").filter(Boolean)
    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")

      // Don't link the last item (current page)
      const isLast = index === segments.length - 1
      return {
        label: label === "New" ? "Create New" : label,
        href: isLast ? undefined : href,
      }
    })
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
      {showHome && (
        <>
          <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
          <ChevronRight className="h-4 w-4" />
        </>
      )}
      {breadcrumbs.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4" />}
        </span>
      ))}
    </nav>
  )
}
