import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileEditForm } from "@/components/features/profile-edit-form"

export default async function EditProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      *,
      address:addresses(*)
    `,
    )
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen pb-24 pt-20 md:pb-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="mt-2 text-muted-foreground">Update your personal information</p>
        </div>

        <ProfileEditForm profile={profile} userId={user.id} />
      </div>
    </div>
  )
}
