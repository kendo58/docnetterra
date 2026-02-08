import type React from "react"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { ObservabilityProvider } from "@/components/observability/observability-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import "leaflet/dist/leaflet.css"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: {
    default: "SitSwap Admin",
    template: "%s | SitSwap Admin",
  },
  description: "SitSwap Trust & Safety admin portal",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ObservabilityProvider>
            {children}
            <Toaster />
            <SonnerToaster />
          </ObservabilityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
