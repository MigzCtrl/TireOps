'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  const effectiveDate = 'January 13, 2026';
  const companyName = 'TireOps';
  const companyEmail = 'privacy@tireops.com';

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg border-b border-border-muted">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-text">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-bg rounded-xl border border-border-muted p-6 md:p-10">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-text-muted text-sm mb-8">
              Effective Date: {effectiveDate}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">1. Introduction</h2>
              <p className="text-text-muted leading-relaxed">
                {companyName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
                you use our tire shop management software and services (collectively, the &quot;Service&quot;).
                Please read this policy carefully. By using the Service, you consent to the practices described herein.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium text-text mt-6 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, and password when you register</li>
                <li><strong>Business Information:</strong> Shop name, address, tax ID, and business details</li>
                <li><strong>Customer Data:</strong> Information about your customers that you enter into the Service</li>
                <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely by Stripe)</li>
                <li><strong>Communications:</strong> Messages you send to us for support or feedback</li>
              </ul>

              <h3 className="text-lg font-medium text-text mt-6 mb-3">2.2 Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, and actions taken within the Service</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device type, and screen resolution</li>
                <li><strong>Log Data:</strong> IP address, access times, and referring URLs</li>
                <li><strong>Cookies:</strong> Session and preference cookies for functionality and analytics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">3. How We Use Your Information</h2>
              <p className="text-text-muted leading-relaxed mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative messages, updates, and security alerts</li>
                <li>Respond to your comments, questions, and support requests</li>
                <li>Monitor and analyze usage trends to improve user experience</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">4. Information Sharing</h2>
              <p className="text-text-muted leading-relaxed mb-3">
                We do not sell your personal information. We may share your information only in these circumstances:
              </p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our Service (hosting, payment processing, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
                <li><strong>Aggregated Data:</strong> We may share anonymized, aggregated data that cannot identify you</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">5. Data Security</h2>
              <p className="text-text-muted leading-relaxed">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside text-text-muted mt-3 space-y-2">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and monitoring</li>
                <li>Employee access restrictions and training</li>
                <li>Secure data centers with physical security measures</li>
              </ul>
              <p className="text-text-muted leading-relaxed mt-3">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">6. Data Retention</h2>
              <p className="text-text-muted leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide the Service.
                We may retain certain information after account closure to comply with legal obligations, resolve
                disputes, and enforce agreements. Customer data you enter is retained according to your subscription
                and may be deleted upon request after account termination.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">7. Your Rights and Choices</h2>
              <p className="text-text-muted leading-relaxed mb-3">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
                <li><strong>Restrict Processing:</strong> Request limitations on how we use your data</li>
              </ul>
              <p className="text-text-muted leading-relaxed mt-3">
                To exercise these rights, contact us at <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">8. Cookies and Tracking</h2>
              <p className="text-text-muted leading-relaxed mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li>Keep you logged in and remember your preferences</li>
                <li>Understand how you use the Service</li>
                <li>Improve performance and user experience</li>
                <li>Provide analytics and usage insights</li>
              </ul>
              <p className="text-text-muted leading-relaxed mt-3">
                You can control cookies through your browser settings. Note that disabling cookies may affect
                certain features of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">9. Third-Party Services</h2>
              <p className="text-text-muted leading-relaxed mb-3">
                Our Service integrates with third-party services that have their own privacy policies:
              </p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li><strong>Supabase:</strong> Database and authentication services</li>
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>Vercel:</strong> Hosting and deployment</li>
                <li><strong>Sentry:</strong> Error monitoring and reporting</li>
              </ul>
              <p className="text-text-muted leading-relaxed mt-3">
                We encourage you to review the privacy policies of these services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">10. International Data Transfers</h2>
              <p className="text-text-muted leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of
                residence. These countries may have different data protection laws. By using the Service, you
                consent to the transfer of your information to the United States and other countries where we
                or our service providers operate.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">11. Children&apos;s Privacy</h2>
              <p className="text-text-muted leading-relaxed">
                The Service is not intended for children under 16 years of age. We do not knowingly collect
                personal information from children under 16. If you believe we have collected information from
                a child under 16, please contact us immediately at <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">12. California Privacy Rights (CCPA)</h2>
              <p className="text-text-muted leading-relaxed">
                California residents have additional rights under the California Consumer Privacy Act (CCPA),
                including the right to know what personal information is collected, request deletion, and opt
                out of the sale of personal information. We do not sell personal information. To exercise your
                CCPA rights, contact us at <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">13. European Privacy Rights (GDPR)</h2>
              <p className="text-text-muted leading-relaxed">
                If you are in the European Economic Area (EEA), you have rights under the General Data Protection
                Regulation (GDPR), including access, rectification, erasure, and data portability. Our legal basis
                for processing your data includes contract performance, legitimate interests, and consent. You may
                lodge a complaint with a supervisory authority if you believe your rights have been violated.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">14. Changes to This Policy</h2>
              <p className="text-text-muted leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by
                email or through the Service. Your continued use of the Service after changes become effective
                constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">15. Contact Us</h2>
              <p className="text-text-muted leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 p-4 bg-bg-light rounded-lg border border-border-muted">
                <p className="text-text font-medium">{companyName} Privacy Team</p>
                <p className="text-text-muted">
                  Email: <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>
                </p>
              </div>
            </section>

            <div className="mt-12 pt-6 border-t border-border-muted">
              <p className="text-text-muted text-sm">
                By using {companyName}, you acknowledge that you have read and understood this Privacy Policy.
              </p>
              <p className="text-text-muted text-sm mt-2">
                See also: <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
