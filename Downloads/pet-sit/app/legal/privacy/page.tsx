import { Navbar } from "@/components/navigation/navbar"
import { Card, CardContent } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pb-24 pt-20 md:pb-8 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 11, 2024</p>

          <Card>
            <CardContent className="p-8 prose prose-sm max-w-none">
              <h2>1. Information We Collect</h2>

              <h3>Personal Information</h3>
              <ul>
                <li>Name, email address, phone number</li>
                <li>Date of birth and address</li>
                <li>Government-issued ID for verification</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Profile photos and descriptions</li>
              </ul>

              <h3>Usage Information</h3>
              <ul>
                <li>Browsing activity and search queries</li>
                <li>Messages and communications</li>
                <li>Device information and IP address</li>
                <li>Location data (with your permission)</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Provide and improve our services</li>
                <li>Verify user identities and conduct background checks</li>
                <li>Process payments and insurance purchases</li>
                <li>Send notifications about matches, messages, and sits</li>
                <li>Ensure safety and prevent fraud</li>
                <li>Comply with legal requirements</li>
              </ul>

              <h2>3. Information Sharing</h2>
              <p>We share information with:</p>
              <ul>
                <li>Other users (limited to what's necessary for sits)</li>
                <li>Third-party service providers (Stripe, background check providers, insurance partners)</li>
                <li>Law enforcement when legally required</li>
              </ul>
              <p>We never sell your personal information to third parties.</p>

              <h2>4. Data Security</h2>
              <p>
                We implement industry-standard security measures including encryption, secure servers, and access
                controls. However, no system is completely secure, and we cannot guarantee absolute security.
              </p>

              <h2>5. Your Rights (GDPR & CCPA)</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Object to processing</li>
                <li>Data portability</li>
                <li>Opt-out of marketing communications</li>
              </ul>

              <h2>6. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide services.
                Financial records are kept for 7 years, other data for 3 years after account closure, unless longer
                retention is required by law.
              </p>

              <h2>7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to improve user experience, analyze usage, and provide
                personalized content. You can control cookie preferences through your browser settings.
              </p>

              <h2>8. Children's Privacy</h2>
              <p>
                SitSwap is not intended for users under 18 years of age. We do not knowingly collect information from
                children.
              </p>

              <h2>9. International Users</h2>
              <p>
                Your information may be transferred to and processed in the United States. By using SitSwap, you
                consent to this transfer.
              </p>

              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this privacy policy periodically. We'll notify you of significant changes via email or
                platform notification.
              </p>

              <h2>11. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact:{" "}
                <a href="mailto:privacy@sitswap.app">privacy@sitswap.app</a>
              </p>
              <p>Data Protection Officer: dpo@sitswap.app</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
