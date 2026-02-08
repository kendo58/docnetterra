import { getFlaggedReviews, unflagReview, deleteReview } from "@/lib/admin/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Flag, Trash2, CheckCircle } from "lucide-react"

type ReviewParty = {
  full_name: string | null
  email: string | null
}

type FlaggedReviewRow = {
  id: string
  rating: number
  created_at: string
  review_text: string | null
  flagged_reason: string | null
  reviewer: ReviewParty | null
  reviewee: ReviewParty | null
}

async function handleUnflag(reviewId: string) {
  "use server"
  await unflagReview(reviewId)
}

async function handleDelete(reviewId: string) {
  "use server"
  await deleteReview(reviewId)
}

export default async function AdminReviewsPage() {
  const reviews = ((await getFlaggedReviews()) ?? []) as FlaggedReviewRow[]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Flagged Reviews</h1>
        <p className="text-slate-400 mt-2">Review and moderate flagged user reviews</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-50">Flagged Reviews ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No flagged reviews</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="p-6 bg-slate-900/50 border border-slate-700 rounded-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-slate-600"
                              }`}
                            />
                          ))}
                        </div>
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
                          <Flag className="h-3 w-3 mr-1" />
                          Flagged
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-300">Reviewer:</span>
                          <span className="text-slate-400">{review.reviewer?.full_name || review.reviewer?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-300">Reviewee:</span>
                          <span className="text-slate-400">{review.reviewee?.full_name || review.reviewee?.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</div>
                  </div>

                  {review.review_text && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-300">Review:</span>
                      <p className="mt-2 text-slate-400 bg-slate-900/50 p-3 rounded border border-slate-700">
                        {review.review_text}
                      </p>
                    </div>
                  )}

                  {review.flagged_reason && (
                    <div className="text-sm">
                      <span className="font-medium text-red-400">Reason Flagged:</span>
                      <p className="mt-2 text-slate-400 bg-red-500/5 p-3 rounded border border-red-500/20">
                        {review.flagged_reason}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <form action={handleUnflag.bind(null, review.id)}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Unflag (Keep Review)
                      </Button>
                    </form>
                    <form action={handleDelete.bind(null, review.id)}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Review
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
