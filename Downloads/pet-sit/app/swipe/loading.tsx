import { Skeleton } from "@/components/ui/skeleton"
import { Navbar } from "@/components/navigation/navbar"

export default function SwipeLoading() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto mt-2" />
          </div>

          <div className="relative h-[600px]">
            <Skeleton className="absolute inset-0 rounded-2xl" />
          </div>

          <div className="flex justify-center gap-4 mt-8">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </>
  )
}
