"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreVertical, Edit, Trash2 } from "lucide-react"
import { revokeAdminAccess, updateAdminRole } from "@/lib/admin/actions"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function AdminUserActions({ adminId, currentRole }: { adminId: string; currentRole: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const applyRole = async (role: "moderator" | "admin" | "super_admin") => {
    if (role === currentRole) return

    setLoading(true)
    try {
      await updateAdminRole(adminId, role)
      toast.success("Admin role updated", {
        description: `Access level changed to ${role.replace("_", " ")}.`,
      })
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update admin role"
      toast.error("Failed to update admin role", { description: message })
    } finally {
      setLoading(false)
    }
  }

  const confirmRevokeAccess = async () => {
    setLoading(true)
    try {
      await revokeAdminAccess(adminId)
      toast.success("Admin access revoked")
      setRevokeOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke admin access"
      toast.error("Failed to revoke admin access", { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading} className="text-slate-400 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-slate-800 border-slate-700">
          <DropdownMenuItem
            className="text-slate-200 hover:bg-slate-700"
            disabled={loading || currentRole === "moderator"}
            onClick={() => applyRole("moderator")}
          >
            <Edit className="w-4 h-4 mr-2" />
            Set as Moderator
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-slate-200 hover:bg-slate-700"
            disabled={loading || currentRole === "admin"}
            onClick={() => applyRole("admin")}
          >
            <Edit className="w-4 h-4 mr-2" />
            Set as Admin
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-slate-200 hover:bg-slate-700"
            disabled={loading || currentRole === "super_admin"}
            onClick={() => applyRole("super_admin")}
          >
            <Edit className="w-4 h-4 mr-2" />
            Set as Super Admin
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-400 hover:bg-slate-700 hover:text-red-300"
            disabled={loading}
            onClick={() => setRevokeOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent className="border-slate-700 bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Revoke admin access?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This user will immediately lose administrative access to the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="border-slate-700 bg-slate-800 text-slate-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeAccess}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? "Revoking..." : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
