"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export async function updateProfile(formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const updates = {
    full_name: formData.get("full_name") as string,
    phone: formData.get("phone") as string,
    bio: formData.get("bio") as string,
    user_type: formData.get("user_type") as string,
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

  if (error) {
    console.error("[sitswap] Error updating profile:", error)
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { error: null }
}

export async function createSitterProfile(formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const petExperience = {
    dog: formData.get("experience_dog") === "true",
    cat: formData.get("experience_cat") === "true",
    bird: formData.get("experience_bird") === "true",
    fish: formData.get("experience_fish") === "true",
  }

  const { error } = await supabase
    .from("sitter_profiles")
    .insert({
      user_id: user.id,
      experience_years: Number.parseInt(formData.get("experience_years") as string) || 0,
      pet_experience: petExperience,
      about_me: formData.get("about_me") as string,
      why_sitting: formData.get("why_sitting") as string,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error("[sitswap] Error creating sitter profile:", error)
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { error: null }
}
