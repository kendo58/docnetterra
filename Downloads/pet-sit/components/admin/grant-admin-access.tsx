"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { grantAdminAccessByEmail } from "@/lib/admin/actions"

export function GrantAdminAccess() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "super_admin" | "moderator">("admin")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      const result = await grantAdminAccessByEmail(email, role)
      if (!result.success) {
        setError(result.error ?? "Failed to grant admin access.")
        return
      }

      setSuccessMessage("Admin access granted successfully.")
      setEmail("")
      router.refresh()
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to grant admin access."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Grant Admin Access
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Grant Admin Access</DialogTitle>
          <DialogDescription className="text-slate-400">Add a new administrator to the platform</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              User Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">The user must already have an account</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-slate-200">
              Admin Role
            </Label>
            <Select
              value={role}
              onValueChange={(value) => {
                if (value === "admin" || value === "super_admin" || value === "moderator") {
                  setRole(value)
                }
              }}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="moderator">Moderator - Limited permissions</SelectItem>
                <SelectItem value="admin">Admin - Full user/listing management</SelectItem>
                <SelectItem value="super_admin">Super Admin - All permissions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-700 text-slate-200"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? "Granting Access..." : "Grant Access"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
