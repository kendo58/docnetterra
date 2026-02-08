import { Spinner } from "@/components/ui/spinner"

export default function ConversationLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <Spinner className="h-8 w-8" />
      <p className="mt-4 text-muted-foreground">Loading conversation...</p>
    </div>
  )
}
