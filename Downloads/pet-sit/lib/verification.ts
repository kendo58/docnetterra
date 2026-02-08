import "server-only"
import { getStripe } from "./stripe"

/**
 * Stripe Identity Verification
 * For government ID verification
 */

export async function createVerificationSession(userId: string, _email: string) {
  try {
    const stripe = getStripe()
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: userId,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
    })

    return {
      success: true,
      sessionId: verificationSession.id,
      clientSecret: verificationSession.client_secret,
      url: verificationSession.url,
    }
  } catch (error) {
    console.error("Error creating verification session:", error)
    return {
      success: false,
      error: "Failed to create verification session",
    }
  }
}

export async function checkVerificationStatus(sessionId: string) {
  try {
    const stripe = getStripe()
    const session = await stripe.identity.verificationSessions.retrieve(sessionId)

    return {
      success: true,
      status: session.status,
      verifiedData: session.verified_outputs,
      lastError: session.last_error,
    }
  } catch (error) {
    console.error("Error checking verification status:", error)
    return {
      success: false,
      error: "Failed to check verification status",
    }
  }
}
