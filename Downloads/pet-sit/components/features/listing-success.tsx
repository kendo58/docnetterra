"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Home, Search, Plus, ArrowRight, Sparkles } from "lucide-react"
import { launchConfetti } from "@/lib/confetti"

interface ListingSuccessProps {
  listingId: string
  listingTitle: string
  isStayListing?: boolean
}

export function ListingSuccess({ listingId, listingTitle, isStayListing }: ListingSuccessProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    void launchConfetti("success")

    // Show content after a small delay
    setTimeout(() => setShowContent(true), 300)
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="max-w-lg w-full border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center text-white">
          <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Listing Created!</h1>
          <p className="text-white/90">Your listing is now live and ready to be discovered</p>
        </div>

        <CardContent
          className={`p-6 space-y-6 transition-all duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}
        >
          <div className="text-center">
            <h2 className="font-semibold text-lg mb-1 truncate">{listingTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {isStayListing
                ? "Hosts can now see your profile and reach out to you"
                : "Potential sitters can now discover your listing"}
            </p>
          </div>

          <div className="space-y-3">
            <Link href={`/listings/${listingId}`} className="block">
              <Button className="w-full gap-2" size="lg">
                <Sparkles className="h-4 w-4" />
                View Your Listing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full gap-2 bg-transparent">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="outline" className="w-full gap-2 bg-transparent">
                  <Search className="h-4 w-4" />
                  Browse
                </Button>
              </Link>
            </div>

            <Link href="/listings/new" className="block">
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" />
                Create Another Listing
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-3 text-sm">What&apos;s Next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Complete your profile to increase trust</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Browse listings and start matching</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Respond quickly to messages for better visibility</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
