import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ConversationNotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Conversation not found</h2>
          <p className="mt-2 text-muted-foreground">
            This conversation may have been deleted or you don&apos;t have access to it.
          </p>
          <Link href="/messages" className="mt-6 inline-block">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Messages
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
