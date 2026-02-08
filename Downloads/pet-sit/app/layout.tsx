import type React from "react"
import type { Metadata, Viewport } from "next"
import { ProductAnalytics } from "@/components/analytics/posthog"
import { OrganizationStructuredData, WebsiteStructuredData } from "@/components/seo/structured-data"
import { ThemeProvider } from "@/components/theme-provider"
import { ObservabilityProvider } from "@/components/observability/observability-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import "leaflet/dist/leaflet.css"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "SitSwap - Pet & Home Care Exchange",
    template: "%s | SitSwap",
  },
  description:
    "Find trusted sitters and enjoy free stays in exchange for pet care and agreed-upon home chores.",
  keywords: [
    "pet sitting",
    "house sitting",
    "free accommodation",
    "pet care exchange",
    "travel accommodation",
    "trusted pet sitters",
    "house chores",
  ],
  authors: [{ name: "SitSwap" }],
  creator: "SitSwap",
  publisher: "SitSwap",
  generator: "SitSwap",
  applicationName: "SitSwap",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sitswap.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "SitSwap - Pet & Home Care Exchange",
    description:
      "Find trusted sitters and enjoy free stays in exchange for pet care and agreed-upon home chores.",
    siteName: "SitSwap",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SitSwap - Pet & Home Care Exchange",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SitSwap - Pet & Home Care Exchange",
    description:
      "Find trusted sitters and enjoy free stays in exchange for pet care and agreed-upon home chores.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  category: "travel",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf3" },
    { media: "(prefers-color-scheme: dark)", color: "#15151a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <OrganizationStructuredData />
        <WebsiteStructuredData />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ObservabilityProvider>
            {children}
            <Toaster />
            <SonnerToaster />
            <ProductAnalytics />
          </ObservabilityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
