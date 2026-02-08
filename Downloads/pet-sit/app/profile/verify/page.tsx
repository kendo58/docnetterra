import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, CheckCircle, Star, Lock } from "lucide-react"
import Link from "next/link"

export default async function VerifyPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const verificationTiers = [
    {
      id: "basic",
      name: "Basic",
      price: "Free",
      icon: CheckCircle,
      features: ["Email verification", "Phone verification", "Profile photo"],
      current: true,
    },
    {
      id: "enhanced",
      name: "Enhanced Verification",
      price: "$29.99",
      icon: Shield,
      features: ["Government ID verification", "Selfie matching", "Address verification", "Verified badge on profile"],
      recommended: true,
    },
    {
      id: "premium",
      name: "Premium Verification",
      price: "$49.99",
      icon: Star,
      features: [
        "Everything in Enhanced",
        "Reference verification (3 refs)",
        "Social media verification",
        "Priority support",
        "Premium badge on profile",
      ],
      recommended: false,
    },
  ]

  return (
    <div className="min-h-screen pb-24 pt-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Get Verified</h1>
          <p className="mt-2 text-muted-foreground">Build trust with enhanced identity verification</p>
        </div>

        {/* Why Verify */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Why Get Verified?</CardTitle>
            <CardDescription>
              Verification increases trust and helps you stand out in the SitSwap community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">Build Trust</h3>
                <p className="mt-2 text-sm text-muted-foreground">Show others you're a verified, trustworthy member</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">Get More Matches</h3>
                <p className="mt-2 text-sm text-muted-foreground">Verified users get 3x more matches on average</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">Stay Safe</h3>
                <p className="mt-2 text-sm text-muted-foreground">Identity verification ensures everyone's safety</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Tiers */}
        <div className="grid gap-6 md:grid-cols-3">
          {verificationTiers.map((tier) => {
            const Icon = tier.icon
            return (
              <Card key={tier.id} className={tier.recommended ? "border-2 border-primary" : ""}>
                <CardHeader>
                  {tier.recommended && (
                    <div className="mb-2">
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        Recommended
                      </span>
                    </div>
                  )}
                  {tier.current && (
                    <div className="mb-2">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Current Plan</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{tier.name}</CardTitle>
                      <p className="text-2xl font-bold">{tier.price}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {!tier.current && (
                    <Button className="w-full" variant={tier.recommended ? "default" : "outline"}>
                      Get {tier.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/profile">
            <Button variant="ghost">Maybe Later</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
