import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"

async function getBookingForReview(bookingId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      listing:listings(
        *,
        homeowner:profiles!listings_user_id_fkey(*)
      ),
      sitter:profiles!bookings_sitter_id_fkey(*)
    `)
    .eq("id", bookingId)
    .single()

  if (!booking) redirect("/dashboard")

  // Check if user is part of this booking
  if (booking.sitter_id !== user.id && booking.listing.user_id !== user.id) {
    redirect("/dashboard")
  }

  // Check if already reviewed
  const revieweeId = booking.sitter_id === user.id ? booking.listing.homeowner.id : booking.sitter_id

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("reviewer_id", user.id)
    .single()

  return { booking, revieweeId, existingReview, currentUserId: user.id }
}

export default async function ReviewPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const { booking, revieweeId, existingReview, currentUserId } = await getBookingForReview(bookingId)

  const revieweeName =
    booking.sitter_id === currentUserId ? booking.listing.homeowner.full_name : booking.sitter.full_name

  const revieweeType = booking.sitter_id === currentUserId ? "homeowner" : "sitter"

  if (existingReview) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Review Already Submitted</CardTitle>
              <CardDescription>You've already left a review for this sit.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/dashboard">Back to Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Review {revieweeName}</CardTitle>
            <CardDescription>
              Share your experience as a {revieweeType === "sitter" ? "homeowner" : "sitter"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/reviews" method="POST" className="space-y-6">
              <input type="hidden" name="bookingId" value={bookingId} />
              <input type="hidden" name="revieweeId" value={revieweeId} />

              {/* Overall Rating */}
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label key={rating} className="cursor-pointer">
                      <input type="radio" name="rating" value={rating} required className="sr-only peer" />
                      <Star className="w-8 h-8 text-muted-foreground peer-checked:text-primary peer-checked:fill-primary transition-colors" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Detailed Ratings */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="communication_rating">Communication</Label>
                  <select
                    id="communication_rating"
                    name="communication_rating"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select rating</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accuracy_rating">Accuracy</Label>
                  <select
                    id="accuracy_rating"
                    name="accuracy_rating"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select rating</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cleanliness_rating">Cleanliness</Label>
                  <select
                    id="cleanliness_rating"
                    name="cleanliness_rating"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select rating</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibility_rating">Responsibility</Label>
                  <select
                    id="responsibility_rating"
                    name="responsibility_rating"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select rating</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label htmlFor="review_text">Your Review</Label>
                <Textarea
                  id="review_text"
                  name="review_text"
                  placeholder="Share details about your experience..."
                  className="min-h-[120px]"
                  required
                />
              </div>

              {/* Would Recommend */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="would_recommend"
                  name="would_recommend"
                  value="true"
                  className="rounded border-input"
                />
                <Label htmlFor="would_recommend" className="font-normal cursor-pointer">
                  I would recommend this {revieweeType}
                </Label>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Submit Review
                </Button>
                <Button type="button" variant="outline" asChild>
                  <a href="/dashboard">Cancel</a>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
