"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface DeleteListingButtonProps {
  listingId: string
  listingTitle: string
  variant?: "default" | "outline" | "destructive" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  redirectTo?: string
}

export function DeleteListingButton({
  listingId,
  listingTitle,
  variant = "destructive",
  size = "default",
  className,
  redirectTo = "/listings",
}: DeleteListingButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const supabase = createClient()

      // Delete related records first (pets, tasks, availability)
      await supabase.from("pets").delete().eq("listing_id", listingId)
      await supabase.from("tasks").delete().eq("listing_id", listingId)
      await supabase.from("availability").delete().eq("listing_id", listingId)

      // Delete the listing
      const { error } = await supabase.from("listings").delete().eq("id", listingId)

      if (error) {
        throw error
      }

      toast.success("Listing deleted", {
        description: `"${listingTitle}" has been permanently removed.`,
      })

      setOpen(false)
      router.push(redirectTo)
      router.refresh()
    } catch (error: unknown) {
      console.error("[sitswap] Error deleting listing:", error)
      toast.error("Failed to delete listing", {
        description: error instanceof Error ? error.message : "Please try again later.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Listing
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{listingTitle}" and all associated data including pets, tasks, and
            availability. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
