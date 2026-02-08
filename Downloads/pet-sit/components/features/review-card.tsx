import { Star } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface ReviewCardProps {
  review: {
    id: string
    rating: number
    review_text?: string
    would_recommend?: boolean
    created_at: string
    reviewer: {
      full_name?: string
      profile_photo_url?: string
      verification_tier: string
    }
    accuracy_rating?: number
    communication_rating?: number
    cleanliness_rating?: number
    responsibility_rating?: number
  }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials =
    review.reviewer.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "??"

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={review.reviewer.profile_photo_url || "/placeholder.svg"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{review.reviewer.full_name || "Anonymous"}</h3>
              {review.reviewer.verification_tier !== "basic" && (
                <Badge variant="secondary" className="text-xs">
                  Verified {review.reviewer.verification_tier}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? "text-primary fill-primary" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{formatDate(review.created_at)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {review.review_text && <p className="text-sm text-foreground leading-relaxed">{review.review_text}</p>}

        {/* Detailed Ratings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          {review.communication_rating && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Communication</div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-sm font-medium">{review.communication_rating}</span>
              </div>
            </div>
          )}
          {review.accuracy_rating && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-sm font-medium">{review.accuracy_rating}</span>
              </div>
            </div>
          )}
          {review.cleanliness_rating && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Cleanliness</div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-sm font-medium">{review.cleanliness_rating}</span>
              </div>
            </div>
          )}
          {review.responsibility_rating && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Responsibility</div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-sm font-medium">{review.responsibility_rating}</span>
              </div>
            </div>
          )}
        </div>

        {review.would_recommend && (
          <Badge variant="outline" className="text-xs">
            Recommended
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
