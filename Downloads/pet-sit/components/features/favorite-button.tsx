"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface FavoriteButtonProps {
  listingId: string
  initialIsFavorite?: boolean
}

export function FavoriteButton({ listingId, initialIsFavorite = false }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleFavorite = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      if (isFavorite) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId)
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId })
      }

      setIsFavorite(!isFavorite)
      router.refresh()
    } catch (error) {
      console.error("[sitswap] Error toggling favorite:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      size="icon"
      variant="outline"
      className={`shrink-0 ${isFavorite ? "bg-red-50 border-red-200" : "bg-transparent"}`}
      onClick={toggleFavorite}
      disabled={isLoading}
    >
      <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
    </Button>
  )
}
