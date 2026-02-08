import { Navbar } from "@/components/navigation/navbar"
import { Card, CardContent } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 11, 2024</p>

          <Card>
            <CardContent className="p-8 prose prose-sm max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using SitSwap ("the Platform"), you accept and agree to be bound by these Terms of
                Service. If you do not agree to these terms, you may not use the Platform.
              </p>

              <h2>2. Platform Description</h2>
              <p>
                SitSwap is a peer-to-peer marketplace that connects homeowners seeking pet sitting and house chore
                assistance with individuals seeking free accommodation in exchange for these services. SitSwap acts
                solely as an intermediary and is not a party to any agreements between users.
              </p>

              <h2>3. User Responsibilities</h2>
              <h3>Homeowners</h3>
              <ul>
                <li>Provide accurate descriptions of properties and responsibilities</li>
                <li>Ensure properties are safe and habitable</li>
                <li>Provide clear instructions for pet care and house maintenance</li>
                <li>Have appropriate insurance for property and pets</li>
              </ul>

              <h3>Sitters</h3>
              <ul>
                <li>Provide accurate information about experience and qualifications</li>
                <li>Fulfill all agreed-upon responsibilities</li>
                <li>Treat property and pets with care and respect</li>
                <li>Follow all house rules and instructions</li>
              </ul>

              <h2>4. Verification and Background Checks</h2>
              <p>
                While we offer verification services including identity verification and background checks, SitSwap
                does not guarantee the accuracy or completeness of any user information. Users are responsible for their
                own due diligence when selecting who to work with.
              </p>

              <h2>5. Limitation of Liability</h2>
              <p>
                SitSwap is not liable for any damages, losses, or injuries arising from user interactions, property
                damage, pet injuries, or any other issues that occur during sits. Users engage with each other at
                their own risk.
              </p>

              <h2>6. Insurance</h2>
              <p>
                Optional insurance products are provided through third-party providers. SitSwap is not an insurance
                provider and makes no guarantees about insurance coverage. Users should review insurance terms carefully
                before purchasing.
              </p>

              <h2>7. Cancellation Policy</h2>
              <p>
                Cancellation terms vary and are outlined at the time a sit is confirmed. Generally, cancellations more than 30
                days before check-in receive full refunds (if insurance was purchased), 14-30 days receive 50% refunds,
                and less than 14 days receive no refunds.
              </p>

              <h2>8. Prohibited Conduct</h2>
              <p>Users may not:</p>
              <ul>
                <li>Provide false or misleading information</li>
                <li>Discriminate based on protected characteristics</li>
                <li>Use the Platform for any illegal purpose</li>
                <li>Harass or threaten other users</li>
                <li>Attempt to circumvent Platform fees or payments</li>
              </ul>

              <h2>9. Termination</h2>
              <p>
                SitSwap reserves the right to suspend or terminate accounts that violate these terms or engage in
                inappropriate conduct.
              </p>

              <h2>10. Changes to Terms</h2>
              <p>
                We may update these terms at any time. Continued use of the Platform after changes constitutes
                acceptance of new terms.
              </p>

              <h2>11. Governing Law</h2>
              <p>
                These terms are governed by the laws of the State of Delaware, United States, without regard to conflict
                of law provisions.
              </p>

              <h2>12. Contact</h2>
              <p>
                For questions about these terms, contact us at:{" "}
                <a href="mailto:legal@sitswap.app">legal@sitswap.app</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
