"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Gift, Copy, Check, Users, DollarSign } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface ReferralSystemProps {
  userId: string
}

export function ReferralSystem({ userId }: ReferralSystemProps) {
  const [referralCode, setReferralCode] = useState("")
  const [referralCredits, setReferralCredits] = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState("")
  const [isSending, setIsSending] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchReferralData = async () => {
      // Get or generate referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code, referral_credits")
        .eq("id", userId)
        .single()

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code)
        setReferralCredits(profile.referral_credits || 0)
      } else {
        // Generate new referral code
        const newCode = `PETSTAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        await supabase.from("profiles").update({ referral_code: newCode }).eq("id", userId)
        setReferralCode(newCode)
      }

      // Get referral count
      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact" })
        .eq("referrer_id", userId)
        .eq("status", "completed")

      setReferralCount(count || 0)
    }

    fetchReferralData()
  }, [userId, supabase])

  const copyToClipboard = async () => {
    const referralLink = `${window.location.origin}/auth/signup?ref=${referralCode}`
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success("Referral link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const sendInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    setIsSending(true)
    try {
      // Check if already referred
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referrer_id", userId)
        .eq("referred_email", email)
        .maybeSingle()

      if (existing) {
        toast.error("You've already invited this email")
        return
      }

      // Create referral record
      await supabase.from("referrals").insert({
        referrer_id: userId,
        referred_email: email,
        referral_code: referralCode,
      })

      toast.success(`Invite sent to ${email}!`)
      setEmail("")
    } catch {
      toast.error("Failed to send invite")
    } finally {
      setIsSending(false)
    }
  }

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${referralCode}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Refer Friends & Earn
        </CardTitle>
        <CardDescription>
          Invite friends to SitSwap and earn $10 credit when they complete their first confirmed sit!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{referralCount}</p>
            <p className="text-xs text-muted-foreground">Successful Referrals</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <DollarSign className="mx-auto h-6 w-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold">${referralCredits}</p>
            <p className="text-xs text-muted-foreground">Credits Earned</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-2">
          <Label>Your Referral Link</Label>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono text-sm" />
            <Button onClick={copyToClipboard} variant="outline" className="shrink-0 bg-transparent">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with friends. When they sign up and complete a confirmed sit, you both earn $10!
          </p>
        </div>

        {/* Referral Code */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your code:</span>
          <Badge variant="secondary" className="font-mono">
            {referralCode}
          </Badge>
        </div>

        {/* Email Invite */}
        <div className="space-y-2">
          <Label>Invite by Email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={sendInvite} disabled={isSending}>
              {isSending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
