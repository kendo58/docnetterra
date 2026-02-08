"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ThumbsUp, Flag } from "lucide-react"
import { format } from "date-fns"
import Image from "next/image"

interface EnhancedReviewCardProps {
  review: {
    id: string
    reviewer: {
      full_name: string
      profile_photo_url?: string
      verification_tier?: string
    }
    rating: number
    accuracy_rating?: number
    communication_rating?: number
    cleanliness_rating?: number
    responsibility_rating?: number
    review_text: string
    photos?: string[]
    would_recommend: boolean
    helpful_count: number
    created_at: string
    response_text?: string
  }
  onHelpful?: () => void
  onReport?: () => void
}

export function EnhancedReviewCard({ review, onHelpful, onReport }: EnhancedReviewCardProps) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.reviewer.profile_photo_url || "/placeholder.svg"} />
              <AvatarFallback>{review.reviewer.full_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{review.reviewer.full_name}</p>
                {review.reviewer.verification_tier === "premium" && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{format(new Date(review.created_at), "MMMM yyyy")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
              />
            ))}
          </div>
        </div>

        {/* Detailed Ratings */}
        {(review.accuracy_rating ||
          review.communication_rating ||
          review.cleanliness_rating ||
          review.responsibility_rating) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {review.accuracy_rating && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-medium">{review.accuracy_rating}/5</span>
              </div>
            )}
            {review.communication_rating && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Communication</span>
                <span className="font-medium">{review.communication_rating}/5</span>
              </div>
            )}
            {review.cleanliness_rating && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cleanliness</span>
                <span className="font-medium">{review.cleanliness_rating}/5</span>
              </div>
            )}
            {review.responsibility_rating && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responsibility</span>
                <span className="font-medium">{review.responsibility_rating}/5</span>
              </div>
            )}
          </div>
        )}

        <p className="text-sm leading-relaxed">{review.review_text}</p>

        {/* Review Photos */}
        {review.photos && review.photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {review.photos.slice(0, 4).map((photo, index) => (
              <div key={index} className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={photo || "/placeholder.svg"}
                  alt={`Review photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {review.would_recommend && (
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
            Would recommend
          </Badge>
        )}

        {/* Response */}
        {review.response_text && (
          <div className="rounded-lg bg-muted p-4 mt-4">
            <p className="text-sm font-medium mb-2">Response from host:</p>
            <p className="text-sm text-muted-foreground">{review.response_text}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <Button variant="ghost" size="sm" className="gap-2" onClick={onHelpful}>
            <ThumbsUp className="h-4 w-4" />
            Helpful ({review.helpful_count})
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onReport}>
            <Flag className="h-4 w-4" />
            Report
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
