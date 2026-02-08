"use client"

import Link from "next/link"
import { SitSwapMark } from "@/components/brand/sitswap-mark"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  href?: string
  size?: "sm" | "md" | "lg"
  className?: string
  showText?: boolean
}

const sizeStyles = {
  sm: {
    container: "h-9 w-9 rounded-lg",
    mark: "h-5 w-5",
    text: "text-lg",
  },
  md: {
    container: "h-10 w-10 rounded-lg",
    mark: "h-6 w-6",
    text: "text-xl",
  },
  lg: {
    container: "h-12 w-12 rounded-xl",
    mark: "h-7 w-7",
    text: "text-2xl",
  },
} as const

export function BrandLogo({ href = "/", size = "md", className, showText = true }: BrandLogoProps) {
  const styles = sizeStyles[size]

  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20",
          styles.container,
        )}
      >
        <SitSwapMark className={styles.mark} />
      </div>
      {showText && <span className={cn("font-bold tracking-tight", styles.text)}>SitSwap</span>}
    </Link>
  )
}

