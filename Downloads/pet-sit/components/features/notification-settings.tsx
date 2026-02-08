"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, Smartphone } from "lucide-react"

interface NotificationSettingsProps {
  userId: string
}

interface Preferences {
  email_new_match: boolean
  email_new_message: boolean
  email_booking_confirmation: boolean
  email_booking_reminder: boolean
  email_review_request: boolean
  email_marketing: boolean
  push_new_match: boolean
  push_new_message: boolean
  push_booking_updates: boolean
}

const defaultPreferences: Preferences = {
  email_new_match: true,
  email_new_message: true,
  email_booking_confirmation: true,
  email_booking_reminder: true,
  email_review_request: true,
  email_marketing: false,
  push_new_match: true,
  push_new_message: true,
  push_booking_updates: true,
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchPreferences = async () => {
      const supabase = createBrowserClient()

      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).single()

      if (data) {
        setPreferences(data as unknown as Preferences)
      }
      setIsLoading(false)
    }

    fetchPreferences()
  }, [userId])

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    setIsSaving(true)
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)

    try {
      const supabase = createBrowserClient()

      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: userId,
        ...newPreferences,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
      toast.success("Preferences updated")
    } catch {
      toast.error("Failed to update preferences")
      setPreferences(preferences)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Choose what emails you'd like to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email_new_match" className="flex-1">
              <span className="font-medium">New matches</span>
              <p className="text-sm text-muted-foreground">Get notified when you match with someone</p>
            </Label>
            <Switch
              id="email_new_match"
              checked={preferences.email_new_match}
              onCheckedChange={(checked) => updatePreference("email_new_match", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_new_message" className="flex-1">
              <span className="font-medium">New messages</span>
              <p className="text-sm text-muted-foreground">Get notified when you receive a message</p>
            </Label>
            <Switch
              id="email_new_message"
              checked={preferences.email_new_message}
              onCheckedChange={(checked) => updatePreference("email_new_message", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_booking_confirmation" className="flex-1">
              <span className="font-medium">Sit confirmations</span>
              <p className="text-sm text-muted-foreground">Receive confirmation when a sit is confirmed</p>
            </Label>
            <Switch
              id="email_booking_confirmation"
              checked={preferences.email_booking_confirmation}
              onCheckedChange={(checked) => updatePreference("email_booking_confirmation", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_booking_reminder" className="flex-1">
              <span className="font-medium">Sit reminders</span>
              <p className="text-sm text-muted-foreground">Get reminded before your sit starts</p>
            </Label>
            <Switch
              id="email_booking_reminder"
              checked={preferences.email_booking_reminder}
              onCheckedChange={(checked) => updatePreference("email_booking_reminder", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_review_request" className="flex-1">
              <span className="font-medium">Review requests</span>
              <p className="text-sm text-muted-foreground">Reminder to leave reviews after stays</p>
            </Label>
            <Switch
              id="email_review_request"
              checked={preferences.email_review_request}
              onCheckedChange={(checked) => updatePreference("email_review_request", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <Label htmlFor="email_marketing" className="flex-1">
              <span className="font-medium">Marketing emails</span>
              <p className="text-sm text-muted-foreground">Tips, promotions, and platform updates</p>
            </Label>
            <Switch
              id="email_marketing"
              checked={preferences.email_marketing}
              onCheckedChange={(checked) => updatePreference("email_marketing", checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Real-time notifications in your browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push_new_match" className="flex-1">
              <span className="font-medium">New matches</span>
              <p className="text-sm text-muted-foreground">Instant notification when you match</p>
            </Label>
            <Switch
              id="push_new_match"
              checked={preferences.push_new_match}
              onCheckedChange={(checked) => updatePreference("push_new_match", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_new_message" className="flex-1">
              <span className="font-medium">New messages</span>
              <p className="text-sm text-muted-foreground">Get notified of new messages instantly</p>
            </Label>
            <Switch
              id="push_new_message"
              checked={preferences.push_new_message}
              onCheckedChange={(checked) => updatePreference("push_new_message", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_booking_updates" className="flex-1">
              <span className="font-medium">Sit updates</span>
              <p className="text-sm text-muted-foreground">Status changes and reminders</p>
            </Label>
            <Switch
              id="push_booking_updates"
              checked={preferences.push_booking_updates}
              onCheckedChange={(checked) => updatePreference("push_booking_updates", checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
