"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Heart,
  Home,
  Globe,
  CheckCircle,
  Star,
  Sparkles,
  Users,
  ArrowRight,
  Play,
  Quote,
  Briefcase,
} from "lucide-react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { Footer } from "@/components/features/footer"
import { QuickSearch } from "@/components/features/quick-search"
import { createBrowserClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/navigation/theme-toggle"

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setIsLoggedIn(!!session?.user)
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo size="sm" />

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Listings
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#trust-safety"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Trust & Safety
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isLoading ? (
              <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
            ) : isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/listings/new">
                  <Button size="sm">Create Listing</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-[0.02]" />

        <div className="relative mx-auto max-w-7xl px-4 pt-2 pb-10 sm:px-6 sm:pt-3 sm:pb-12 lg:px-8 lg:pt-4 lg:pb-14">
          <QuickSearch className="mb-4" />
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <Badge variant="secondary" className="mb-4 px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Trusted by 10,000+ members
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance leading-tight">
                Free Stays in Exchange for
                <span className="text-primary block mt-1">Pet Care & Chores</span>
              </h1>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
                Connect with verified homeowners and trusted sitters worldwide. Care for pets, help with chores, and
                enjoy free accommodation in beautiful homes.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {isLoggedIn ? (
                  <>
                    <Link href="/dashboard">
                      <Button variant="brand" size="lg" className="w-full sm:w-auto gap-2 hover-lift">
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/search">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                        Browse Listings
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/signup">
                      <Button variant="brand" size="lg" className="w-full sm:w-auto gap-2 hover-lift">
                        Get Started Free
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/search">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 bg-transparent">
                        <Play className="h-4 w-4" />
                        Browse Listings
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Social Proof */}
              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                      <Image
                        src="/diverse-group.png"
                        alt={`User ${i}`}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">4.9/5 from 2,000+ reviews</p>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-fade-in-up animation-delay-200 lg:block hidden">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/happy-person-relaxing-with-dog-in-modern-living-ro.jpg"
                  alt="Happy person with dog"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Floating Cards */}
              <div className="absolute -left-4 top-8 animate-float">
                <Card className="shadow-lg border-0 bg-background/95 backdrop-blur">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Verified Host</p>
                      <p className="text-xs text-muted-foreground">ID & Background Check</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="absolute -right-4 bottom-12 animate-float animation-delay-500">
                <Card className="shadow-lg border-0 bg-background/95 backdrop-blur">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Star className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">$2,500 Saved</p>
                      <p className="text-xs text-muted-foreground">This month</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">10K+</p>
              <p className="mt-1 text-sm text-muted-foreground">Active Members</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">50+</p>
              <p className="mt-1 text-sm text-muted-foreground">Countries</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">25K+</p>
              <p className="mt-1 text-sm text-muted-foreground">Successful Stays</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">$5M+</p>
              <p className="mt-1 text-sm text-muted-foreground">Saved by Members</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Simple Process
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and find your perfect match
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Profile",
                description:
                  "Sign up and tell us about yourself, your experience with pets or home care, and what you're looking for.",
                icon: Users,
              },
              {
                step: "02",
                title: "Browse & Connect",
                description:
                  "Find homeowners who need help or sitters offering their services. Like listings that interest you.",
                icon: Heart,
              },
              {
                step: "03",
                title: "Match & Stay",
                description:
                  "When both parties like each other, it's a match! Chat, plan your stay, and enjoy your free accommodation.",
                icon: Home,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative group animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Card className="relative h-full border-0 shadow-md group-hover:shadow-xl transition-shadow bg-card">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-5xl font-bold text-muted-foreground/20">{item.step}</span>
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listing Types - Removed House Swap, now only 2 options */}
      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Flexible Options
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Choose How You Participate</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're a homeowner or traveler, we have the perfect option for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/cute-pets-dog-cat-cozy-home.jpg"
                  alt="Find a Sitter"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-primary/90">For Homeowners</Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Find a Sitter</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Need someone to care for your pets or help with chores while you are away? Offer free accommodation in
                  exchange for their help.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Pet sitting while you travel
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    House chores and maintenance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Or both combined
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/traveler-backpack-exploring-city.jpg"
                  alt="Looking for Stay"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-[#6c8fb6] text-white">For Travelers</Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-[#e3edf7] flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-[#5a7ca2]" />
                  </div>
                  <h3 className="text-xl font-semibold">Looking for Stay</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Need a place to stay? Offer your skills in pet sitting or house chores in exchange for free
                  accommodation.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Specify your travel dates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Choose desired location
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Offer pet sitting or chores
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials - Removed House Swapper testimonial */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Success Stories
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">What Our Members Say</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                quote:
                  "I saved over $3,000 on accommodation while traveling through Europe. The pets were adorable and the hosts were wonderful!",
                author: "Sarah M.",
                role: "Pet Sitter",
                avatar: "/professional-headshot.png",
              },
              {
                quote:
                  "Finally found reliable pet care for my travels. My dogs love their sitters and I have peace of mind knowing they're in good hands.",
                author: "David L.",
                role: "Homeowner",
                avatar: "/person-portrait.png",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />
                  <p className="text-lg mb-6 leading-relaxed">{testimonial.quote}</p>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-muted">
                      <Image
                        src={testimonial.avatar || "/placeholder.svg"}
                        alt={testimonial.author}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section id="trust-safety" className="py-20 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                Your Safety Matters
              </Badge>
              <h2 className="text-3xl font-bold sm:text-4xl mb-6">Trust & Safety First</h2>
              <p className="text-lg text-muted-foreground mb-8">
                We take security seriously. Our comprehensive verification process ensures a safe community for
                everyone.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Shield,
                    title: "ID Verification",
                    description: "All members verify their identity through our secure process",
                  },
                  {
                    icon: CheckCircle,
                    title: "Background Checks",
                    description: "Optional enhanced screening for additional peace of mind",
                  },
                  {
                    icon: Star,
                    title: "Reviews & Ratings",
                    description: "Transparent feedback system from real experiences",
                  },
                  {
                    icon: Globe,
                    title: "24/7 Support",
                    description: "Our team is always here to help when you need us",
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/happy-family-with-pet-safe-home.jpg"
                  alt="Safe and trusted community"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of members who are already saving money and making meaningful connections through pet sitting
            and home care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/listings/new">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                    Create a Listing
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Sign Up Free
                  </Button>
                </Link>
                <Link href="/search">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                    Browse Listings
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
