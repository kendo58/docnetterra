import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/navigation/navbar"

export default function MessagesLoading() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-48 mb-8" />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
