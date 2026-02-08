"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { Home, Search, Heart, MessageCircle, Calendar, Shield, ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface OnboardingWizardProps {
  open: boolean
  onComplete: () => void
  onClose?: () => void
  userType?: "host" | "sitter" | "both"
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to SitSwap!",
    description: "Let's get you started in just a few steps",
    icon: Home,
    content: (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Home className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">Find Your Perfect Match</h3>
        <p className="text-muted-foreground">
          Whether you're looking for a pet sitter or a place to stay, we'll help you connect with the right people.
        </p>
      </div>
    ),
  },
  {
    id: "browse",
    title: "Browse Listings",
    description: "Find homes and opportunities",
    icon: Search,
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          <Card className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Find a Sitter</p>
              <p className="text-sm text-muted-foreground">
                List your home and find someone to care for your pets or help with chores
              </p>
            </div>
          </Card>
          <Card className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Looking for Stay</p>
              <p className="text-sm text-muted-foreground">Offer your services in exchange for accommodation</p>
            </div>
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "match",
    title: "Match & Connect",
    description: "Find your perfect match",
    icon: Heart,
    content: (
      <div className="space-y-4 text-center">
        <div className="flex justify-center gap-2">
          <div className="h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center animate-bounce-in">
            <Heart className="h-8 w-8 text-rose-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">Swipe to Match</h3>
        <p className="text-muted-foreground">
          Like listings you're interested in. When both parties like each other, it's a match! You can then message and
          coordinate your stay.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <ArrowRight className="h-6 w-6 rotate-180" />
            </div>
            <p className="text-sm text-muted-foreground">Pass</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500 flex items-center justify-center mx-auto mb-2">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">Like</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "communicate",
    title: "Communicate Safely",
    description: "Message your matches",
    icon: MessageCircle,
    content: (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-blue-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">Chat & Coordinate</h3>
        <p className="text-muted-foreground">
          Once you match, use our built-in messaging to discuss details, share expectations, and finalize your
          arrangements.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">All messages are secure and private</span>
        </div>
      </div>
    ),
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start exploring",
    icon: CheckCircle2,
    content: (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce-in">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">Ready to Go!</h3>
        <p className="text-muted-foreground">
          You're all set to start using SitSwap. Complete your profile to increase your chances of finding the perfect
          match!
        </p>
      </div>
    ),
  },
]

export function OnboardingWizard({ open, onComplete, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const progress = ((currentStep + 1) / steps.length) * 100

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onComplete()
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const step = steps[currentStep]

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="space-y-4">
            <Progress value={progress} className="h-1" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{step.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">{step.content}</div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(currentStep === 0 && "invisible")}
          >
            Back
          </Button>
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === currentStep ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
