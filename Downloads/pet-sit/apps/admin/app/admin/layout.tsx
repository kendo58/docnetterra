import type React from "react"

export const metadata = {
  title: "SitSwap Admin Portal",
  description: "Trust & Safety Management Dashboard",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
