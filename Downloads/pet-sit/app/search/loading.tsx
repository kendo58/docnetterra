import { Navbar } from "@/components/navigation/navbar"
import { Footer } from "@/components/features/footer"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingSearchPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-6 md:pb-8 md:pt-20 bg-background flex flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 space-y-5">
          <Skeleton className="h-24 w-full rounded-2xl" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-72" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-80" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
