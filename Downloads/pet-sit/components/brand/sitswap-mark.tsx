"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SitSwapMarkProps = React.SVGProps<SVGSVGElement>

export function SitSwapMark({ className, ...props }: SitSwapMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <path
        d="M4 10.5L12 4l8 6.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle cx="9" cy="13" r="1.1" fill="currentColor" />
      <circle cx="11" cy="11.8" r="1.1" fill="currentColor" />
      <circle cx="13" cy="11.8" r="1.1" fill="currentColor" />
      <circle cx="15" cy="13" r="1.1" fill="currentColor" />
      <path
        d="M12 14.5c-2.2 0-4 1.4-4 3.2 0 1.4 1.4 2.4 4 2.4s4-1 4-2.4c0-1.8-1.8-3.2-4-3.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

