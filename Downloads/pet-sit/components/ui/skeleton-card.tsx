"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="aspect-[4/3] w-full skeleton" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="h-5 w-3/4 skeleton" />
        <div className="h-4 w-1/2 skeleton" />
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-2/3 skeleton" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="h-4 w-1/3 skeleton" />
      </CardFooter>
    </Card>
  )
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  )
}
