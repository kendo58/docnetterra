import { Navbar } from "@/components/navigation/navbar"
import { Footer } from "@/components/features/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { MessageCircle, Shield, CreditCard, Home, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function HelpPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-background flex flex-col">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Help Center</h1>
            <p className="text-muted-foreground">Find answers to common questions about SitSwap</p>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Home className="h-8 w-8 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-1">Getting Started</h3>
                <p className="text-sm text-muted-foreground">Learn how to create your first listing</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-1">Safety & Trust</h3>
                <p className="text-sm text-muted-foreground">Understand our verification process</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <CreditCard className="h-8 w-8 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-1">Payments & Insurance</h3>
                <p className="text-sm text-muted-foreground">Learn about insurance options</p>
              </CardContent>
            </Card>
          </div>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
	                  <AccordionTrigger>How does SitSwap work?</AccordionTrigger>
	                  <AccordionContent>
	                    SitSwap connects homeowners who need pet sitting or house chores with travelers looking for free
	                    accommodation. Homeowners create listings, sitters browse and swipe on listings they're interested
	                    in, and when both parties match, they can message and arrange a sit. No money is exchanged for
	                    the accommodation - sitters provide pet care or chores in exchange for free stays.
	                  </AccordionContent>
	                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>Is SitSwap really free?</AccordionTrigger>
                  <AccordionContent>
                    Stays are exchanged (no nightly rates). SitSwap is intended to be membership-based for both
                    homeowners and sitters, with optional add-ons like enhanced verification and optional insurance for
                    added protection.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>How does verification work?</AccordionTrigger>
                  <AccordionContent>
                    We offer three verification tiers: Basic (free - email and phone verification), Enhanced ($29.99 -
                    includes background check and ID verification), and Premium ($49.99 - comprehensive background check
                    with ongoing monitoring). Higher verification tiers increase trust and improve your match rate. All
                    users must complete at least basic verification.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>What if something goes wrong during a stay?</AccordionTrigger>
                  <AccordionContent>
                    We offer optional insurance plans for both homeowners and sitters. Homeowner protection covers
                    property damage up to $1M, theft up to $25K, and pet injury up to $10K. Sitter protection covers
                    personal injury and liability. We also have a 24/7 safety hotline and trust & safety team available
                    to help resolve any issues. You can report problems directly through the app.
                  </AccordionContent>
                </AccordionItem>

	                <AccordionItem value="item-5">
	                  <AccordionTrigger>How do I cancel a sit?</AccordionTrigger>
	                  <AccordionContent>
	                    You can cancel a sit request (or a confirmed sit) from your dashboard. Our cancellation policy
	                    depends on timing: more than 30 days before check-in receives full refund (if insurance was
	                    purchased), 14-30 days receives 50% refund, and less than 14 days receives no refund. Emergency
	                    cancellations are reviewed on a case-by-case basis. Both parties will be notified immediately of
	                    any cancellation.
	                  </AccordionContent>
	                </AccordionItem>

	                <AccordionItem value="item-6">
	                  <AccordionTrigger>Can I have references or previous reviews?</AccordionTrigger>
	                  <AccordionContent>
	                    Yes! After completing a sit, both homeowners and sitters can leave reviews for each other. You
	                    can also add personal references during profile setup - we'll contact them to verify. Previous
	                    reviews and average ratings are displayed prominently on your profile to build trust with potential
	                    matches.
	                  </AccordionContent>
	                </AccordionItem>

	                <AccordionItem value="item-7">
	                  <AccordionTrigger>What responsibilities do sitters have?</AccordionTrigger>
	                  <AccordionContent>
	                    Responsibilities vary by listing and are clearly outlined by the homeowner. Common tasks include
	                    feeding pets, walking dogs, cleaning litter boxes, watering plants, collecting mail, and basic
	                    tidying. All responsibilities are agreed upon before confirming the sit. Sitters are expected to treat the home
	                    with respect and follow all house rules. Homeowners provide detailed care instructions for pets and
	                    properties.
	                  </AccordionContent>
	                </AccordionItem>

	                <AccordionItem value="item-8">
	                  <AccordionTrigger>How do I improve my match rate?</AccordionTrigger>
	                  <AccordionContent>
	                    To increase matches: complete your profile with photos and detailed bio, get verified (higher tiers
	                    get priority in matching), add references, be responsive to messages, maintain a good rating from
	                    previous sits, write clear and honest listing descriptions (for homeowners), and highlight
	                    relevant experience with pets (for sitters). Being flexible with dates also helps.
	                  </AccordionContent>
	                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="mt-8">
            <CardContent className="p-8 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link href="/contact">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:support@sitswap.app">Email Us</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    </>
  )
}
