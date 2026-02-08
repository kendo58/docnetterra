"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { isMissingColumnError } from "@/lib/utils/supabase-errors"

export async function createListing(formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const listingType = (formData.get("listing_type") as string) || "pet_sitting"
  const propertyType = formData.get("property_type") as string
  const bedrooms = Number.parseInt(formData.get("bedrooms") as string) || null
  const bathrooms = Number.parseFloat(formData.get("bathrooms") as string) || null
  const squareFeet = Number.parseInt(formData.get("square_feet") as string) || null

  const payload: Record<string, unknown> = {
    user_id: user.id,
    title,
    description,
    listing_type: listingType,
    property_type: propertyType,
    bedrooms,
    bathrooms,
    square_feet: squareFeet,
    is_active: true,
  }

  let { data: listing, error } = await supabase.from("listings").insert(payload).select().single()

  if (error && isMissingColumnError(error, "listing_type")) {
    delete payload.listing_type
    ;({ data: listing, error } = await supabase.from("listings").insert(payload).select().single())
  }

  if (error) {
    console.error("[sitswap] Error creating listing:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { listing, error: null }
}

export async function updateListing(listingId: string, formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify ownership
  const { data: listing } = await supabase.from("listings").select("user_id").eq("id", listingId).single()

  if (!listing || listing.user_id !== user.id) {
    return { error: "Unauthorized" }
  }

  const updates: Record<string, unknown> = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    property_type: formData.get("property_type") as string,
    bedrooms: Number.parseInt(formData.get("bedrooms") as string) || null,
    bathrooms: Number.parseFloat(formData.get("bathrooms") as string) || null,
    square_feet: Number.parseInt(formData.get("square_feet") as string) || null,
  }

  const listingType = formData.get("listing_type")
  if (typeof listingType === "string" && listingType.trim()) {
    updates.listing_type = listingType
  }

  let { error } = await supabase.from("listings").update(updates).eq("id", listingId)

  if (error && isMissingColumnError(error, "listing_type")) {
    delete updates.listing_type
    ;({ error } = await supabase.from("listings").update(updates).eq("id", listingId))
  }

  if (error) {
    console.error("[sitswap] Error updating listing:", error)
    return { error: error.message }
  }

  revalidatePath(`/listings/${listingId}`)
  revalidatePath("/dashboard")
  return { error: null }
}

export async function deleteListing(listingId: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify ownership
  const { data: listing } = await supabase.from("listings").select("user_id").eq("id", listingId).single()

  if (!listing || listing.user_id !== user.id) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase.from("listings").update({ is_active: false }).eq("id", listingId)

  if (error) {
    console.error("[sitswap] Error deleting listing:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
