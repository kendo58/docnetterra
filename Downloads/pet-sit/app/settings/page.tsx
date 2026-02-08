import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Bell, CreditCard, Lock, Shield, User, ArrowLeft, Palette } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navigation/navbar"
import { Footer } from "@/components/features/footer"
import { ThemeToggle } from "@/components/navigation/theme-toggle"

async function getSettings() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return { user, profile }
}

export default async function SettingsPage() {
  const { user, profile } = await getSettings()

  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-background flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-4 space-y-8">
          {/* Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
          </div>

          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
          </div>

          <div className="grid gap-6">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>Choose how SitSwap looks on your device</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-muted-foreground">Light, dark, or system default</div>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>Account</CardTitle>
                </div>
                <CardDescription>Manage your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Address</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">Phone Number</div>
                    <div className="text-sm text-muted-foreground">{profile?.phone || "Not set"}</div>
                  </div>
                  <Button variant="outline" size="sm">
                    {profile?.phone ? "Change" : "Add"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <CardTitle>Security</CardTitle>
                </div>
                <CardDescription>Manage your security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Password</div>
                    <div className="text-sm text-muted-foreground">••••••••</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>Choose what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">Receive updates via email</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">Push Notifications</div>
                    <div className="text-sm text-muted-foreground">Get notified about new matches and messages</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">SMS Notifications</div>
                    <div className="text-sm text-muted-foreground">Receive important alerts via SMS</div>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">Marketing Emails</div>
                    <div className="text-sm text-muted-foreground">Receive tips and special offers</div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {/* Verification & Trust */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle>Verification & Trust</CardTitle>
                </div>
                <CardDescription>Build trust with enhanced verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Identity Verification</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {profile?.verification_status || "Not verified"}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/profile/verify">Verify</a>
                  </Button>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">Background Check</div>
                    <div className="text-sm text-muted-foreground">Tier: {profile?.verification_tier || "Basic"}</div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/profile/verify">Upgrade</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle>Payment Methods</CardTitle>
                </div>
                <CardDescription>Manage your payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">No payment methods</div>
                    <div className="text-sm text-muted-foreground">Add a payment method for insurance purchases</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Add Card
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Deactivate Account</div>
                    <div className="text-sm text-muted-foreground">Temporarily disable your account</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Deactivate
                  </Button>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <div className="font-medium">Delete Account</div>
                    <div className="text-sm text-muted-foreground">Permanently delete your account and data</div>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    </>
  )
}
