import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingReports() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-64 bg-slate-700" />
        <Skeleton className="h-5 w-96 mt-2 bg-slate-700" />
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <Skeleton className="h-7 w-48 bg-slate-700" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-slate-900/50 border border-slate-700 rounded-lg space-y-4">
                <Skeleton className="h-20 w-full bg-slate-700" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
