"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[sitswap] Conversation error:", error)
  }, [error])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Unable to load conversation</h2>
          <p className="mt-2 text-muted-foreground">
            {error.message || "Something went wrong while loading this conversation."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Link href="/messages">
              <Button variant="outline" className="gap-2 w-full bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Back to Messages
              </Button>
            </Link>
          </div>
          {error.digest && <p className="mt-4 text-xs text-muted-foreground">Error ID: {error.digest}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
