"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FavoritesButtonProps {
  listingId: string
  userId?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost"
  showText?: boolean
}

export function FavoritesButton({
  listingId,
  userId,
  size = "default",
  variant = "ghost",
  showText = false,
}: FavoritesButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    if (!userId) return

    const checkFavorite = async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .maybeSingle()

      setIsFavorited(!!data)
    }

    checkFavorite()
  }, [userId, listingId, supabase])

  const toggleFavorite = async () => {
    if (!userId) {
      toast.error("Please log in to save favorites")
      return
    }

    setIsLoading(true)

    try {
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId)

        setIsFavorited(false)
        toast.success("Removed from favorites")
      } else {
        await supabase.from("favorites").insert({
          user_id: userId,
          listing_id: listingId,
        })

        setIsFavorited(true)
        toast.success("Added to favorites")
      }
    } catch {
      toast.error("Failed to update favorites")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite()
      }}
      disabled={isLoading}
      className={cn("gap-2", isFavorited && "text-red-500 hover:text-red-600")}
    >
      <Heart className={cn("h-4 w-4 transition-all", isFavorited && "fill-current")} />
      {showText && (isFavorited ? "Saved" : "Save")}
    </Button>
  )
}
