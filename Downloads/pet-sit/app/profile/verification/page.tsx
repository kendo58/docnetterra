"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { VerificationFlow } from "@/components/features/verification-flow"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

type VerificationStatus = {
  email_verified: boolean
  phone_verified: boolean
  id_verified: boolean
  background_check: boolean
  photo_verified: boolean
}

export default function VerificationPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      const supabase = createBrowserClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      // Get profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      // Get identity verifications
      const { data: idVerification } = await supabase
        .from("identity_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "verified")
        .maybeSingle()

      // Get background checks
      const { data: bgCheck } = await supabase
        .from("background_checks")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "passed")
        .maybeSingle()

      setVerificationStatus({
        email_verified: !!user.email_confirmed_at,
        phone_verified: !!profile?.phone,
        id_verified: !!idVerification,
        background_check: !!bgCheck,
        photo_verified: !!profile?.profile_photo_url,
      })

      setIsLoading(false)
    }

    fetchVerificationStatus()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-32 w-full rounded-xl mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 pt-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
          <h1 className="text-3xl font-bold">Verify Your Account</h1>
          <p className="mt-2 text-muted-foreground">Build trust with the community by completing verification steps</p>
        </div>

        {userId && verificationStatus && <VerificationFlow userId={userId} currentStatus={verificationStatus} />}
      </div>
    </div>
  )
}
