import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SwipeInterface } from "@/components/features/swipe-interface"
import { Navbar } from "@/components/navigation/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, MessageCircle } from "lucide-react"

export default async function SwipePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

  return (
    <>
      <Navbar />
      <div className="fixed inset-0 pb-24 pt-20 md:pb-8">
        <div className="mx-auto h-full max-w-md px-4">
          <div className="mb-2 flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                <ArrowLeft className="h-3 w-3" />
                Back
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                <Heart className="h-3 w-3" />
                Matches
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                <MessageCircle className="h-3 w-3" />
                Messages
              </Button>
            </Link>
          </div>
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Discover Listings</h1>
            <p className="text-sm text-muted-foreground">Swipe right to like, left to pass</p>
          </div>
          <div className="h-[calc(100%-6rem)]">
            <SwipeInterface userId={user.id} userType={profile?.user_type || "sitter"} />
          </div>
        </div>
      </div>
    </>
  )
}
