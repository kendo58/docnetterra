import type React from "react"
import { notFound } from "next/navigation"

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound()
  return <>{children}</>
}
