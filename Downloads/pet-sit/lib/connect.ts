import "server-only"
import type Stripe from "stripe"
import { getStripe } from "./stripe"
import { getSiteUrl } from "./url"

/**
 * Stripe Connect for Marketplace Payments
 * Homeowners become connected accounts to receive payments
 */

export async function createConnectAccount(userId: string, email: string) {
  try {
    const stripe = getStripe()
    const account = await stripe.accounts.create({
      type: "express",
      email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        user_id: userId,
      },
    })

    return {
      success: true,
      accountId: account.id,
    }
  } catch (error) {
    console.error("Error creating connect account:", error)
    return {
      success: false,
      error: "Failed to create connect account",
    }
  }
}

export async function createAccountLink(accountId: string, _userId: string) {
  try {
    const stripe = getStripe()
    const siteUrl = await getSiteUrl()

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/profile/connect/refresh`,
      return_url: `${siteUrl}/profile/connect/return`,
      type: "account_onboarding",
    })

    return {
      success: true,
      url: accountLink.url,
    }
  } catch (error) {
    console.error("Error creating account link:", error)
    return {
      success: false,
      error: "Failed to create account link",
    }
  }
}

export async function getAccountStatus(accountId: string) {
  try {
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(accountId)

    return {
      success: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    }
  } catch (error) {
    console.error("Error getting account status:", error)
    return {
      success: false,
      error: "Failed to get account status",
    }
  }
}

/**
 * Create payment for insurance purchase
 */
export async function createInsurancePayment(
  customerId: string,
  amount: number,
  bookingId: string,
  insuranceType: string,
) {
  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      metadata: {
        booking_id: bookingId,
        insurance_type: insuranceType,
      },
      application_fee_amount: Math.round(amount * 100 * 0.1), // 10% platform fee
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error("Error creating insurance payment:", error)
    return {
      success: false,
      error: "Failed to create payment",
    }
  }
}

/**
 * Process refund for cancelled booking
 */
export async function processRefund(paymentIntentId: string, amount?: number, reason?: Stripe.RefundCreateParams.Reason) {
  try {
    const stripe = getStripe()
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason,
    })

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
    }
  } catch (error) {
    console.error("Error processing refund:", error)
    return {
      success: false,
      error: "Failed to process refund",
    }
  }
}
