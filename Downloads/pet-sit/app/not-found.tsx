import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/30 to-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground leading-relaxed">
            {"Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
              <Search className="mr-2 h-4 w-4" />
              Search Listings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
