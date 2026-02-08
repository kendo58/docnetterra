"use client"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Shield, CheckCircle, Mail, Phone, CreditCard, FileCheck, Camera, ArrowRight, Loader2 } from "lucide-react"

interface VerificationFlowProps {
  userId: string
  currentStatus: {
    email_verified: boolean
    phone_verified: boolean
    id_verified: boolean
    background_check: boolean
    photo_verified: boolean
  }
}

const verificationSteps = [
  {
    id: "email",
    title: "Email Verification",
    description: "Verify your email address",
    icon: Mail,
    key: "email_verified" as const,
  },
  {
    id: "phone",
    title: "Phone Verification",
    description: "Add and verify your phone number",
    icon: Phone,
    key: "phone_verified" as const,
  },
  {
    id: "photo",
    title: "Profile Photo",
    description: "Upload a clear profile photo",
    icon: Camera,
    key: "photo_verified" as const,
  },
  {
    id: "id",
    title: "ID Verification",
    description: "Verify your government-issued ID",
    icon: CreditCard,
    key: "id_verified" as const,
  },
  {
    id: "background",
    title: "Background Check",
    description: "Complete a background check (optional)",
    icon: FileCheck,
    key: "background_check" as const,
  },
]

export function VerificationFlow({ userId, currentStatus }: VerificationFlowProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [status] = useState(currentStatus)

  const completedSteps = Object.values(status).filter(Boolean).length
  const totalSteps = verificationSteps.length
  const progressPercent = (completedSteps / totalSteps) * 100

  const handleVerification = async (stepId: string) => {
    setIsLoading(stepId)

    try {
      const supabase = createBrowserClient()

      switch (stepId) {
        case "email":
          // Resend verification email
          const { error: emailError } = await supabase.auth.resend({
            type: "signup",
            email: (await supabase.auth.getUser()).data.user?.email || "",
          })
          if (emailError) throw emailError
          toast.success("Verification email sent! Check your inbox.")
          break

        case "phone":
          // Redirect to phone verification page
          window.location.href = "/profile/verify-phone"
          return

        case "photo":
          // Redirect to profile edit
          window.location.href = "/profile?tab=photo"
          return

        case "id":
          // Start ID verification flow
          const { error: idError } = await supabase
            .from("identity_verifications")
            .insert({
              user_id: userId,
              verification_type: "government_id",
              status: "pending",
            })
            .select()
            .single()

          if (idError) throw idError

          // In production, redirect to Stripe Identity or similar
          toast.info("ID verification initiated. You'll receive instructions via email.")
          break

        case "background":
          // Start background check flow
          const { error: bgError } = await supabase.from("background_checks").insert({
            user_id: userId,
            check_type: "standard",
            provider: "checkr",
            status: "pending",
          })

          if (bgError) throw bgError
          toast.info("Background check initiated. This typically takes 2-3 business days.")
          break
      }
    } catch {
      toast.error("Failed to start verification. Please try again.")
    } finally {
      setIsLoading(null)
    }
  }

  const getVerificationTier = () => {
    if (completedSteps >= 5) return { tier: "Platinum", color: "bg-purple-500" }
    if (completedSteps >= 4) return { tier: "Gold", color: "bg-yellow-500" }
    if (completedSteps >= 2) return { tier: "Silver", color: "bg-gray-400" }
    return { tier: "Basic", color: "bg-gray-300" }
  }

  const tier = getVerificationTier()

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Verification Status
              </CardTitle>
              <CardDescription>Complete verification steps to build trust with other members</CardDescription>
            </div>
            <Badge className={tier.color}>{tier.tier} Member</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">
                {completedSteps} of {totalSteps} completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Verification Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationSteps.map((step) => {
            const Icon = step.icon
            const isCompleted = status[step.key]
            const isInProgress = isLoading === step.id

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  isCompleted
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                    : "bg-muted/50 border-border"
                }`}
              >
                <div className={`p-2 rounded-full ${isCompleted ? "bg-green-500 text-white" : "bg-muted"}`}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{step.title}</p>
                    {isCompleted && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>

                {!isCompleted && (
                  <Button size="sm" onClick={() => handleVerification(step.id)} disabled={isInProgress}>
                    {isInProgress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Start
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Why Verify?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span>Verified profiles are 3x more likely to get matches</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span>Build trust with hosts and guests before meeting</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span>Unlock premium features and priority support</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span>Higher visibility in search results</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
