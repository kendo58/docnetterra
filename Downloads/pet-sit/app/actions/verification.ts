"use server"

import { createClient } from "@/lib/supabase/server"
import { createVerificationSession } from "@/lib/verification"
import { revalidatePath } from "next/cache"

export async function startIdentityVerification() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Create Stripe Identity verification session
  const result = await createVerificationSession(user.id, user.email!)

  if (!result.success) {
    return result
  }

  // Store session ID in database
  const { error: dbError } = await supabase.from("identity_verifications").insert({
    user_id: user.id,
    verification_type: "enhanced",
    verification_provider: "stripe",
    verification_provider_id: result.sessionId,
    status: "pending",
  })

  if (dbError) {
    console.error("[sitswap] Error storing verification:", dbError)
    return { success: false, error: "Failed to store verification" }
  }

  revalidatePath("/profile/verify")

  return {
    success: true,
    url: result.url,
  }
}
