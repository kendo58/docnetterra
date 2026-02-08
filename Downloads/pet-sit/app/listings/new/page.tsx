"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ListingForm } from "@/components/features/listing-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import Link from "next/link"

export default function NewListingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          setError("Authentication failed. Please try logging in.")
          setLoading(false)
          return
        }

        if (!user) {
          router.push("/auth/login")
          return
        }

        setUserId(user.id)
        setLoading(false)
      } catch {
        setError("Unable to verify authentication. Please try again.")
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">{error}</AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              Go to Login
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <BreadcrumbNav items={[{ label: "Listings", href: "/listings" }, { label: "Create New" }]} />

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Create a Listing</h1>
          <p className="mt-2 text-muted-foreground">
            Share your home and find trusted sitters, or find a place to stay
          </p>
        </div>

        <ListingForm userId={userId} />
      </div>
    </div>
  )
}
