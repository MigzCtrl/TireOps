'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
  const effectiveDate = 'January 13, 2026';
  const companyName = 'TireOps';
  const companyEmail = 'support@tireops.com';

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
          <h1 className="text-lg font-semibold text-text">Terms of Service</h1>
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
              <h2 className="text-xl font-semibold text-text mb-4">1. Acceptance of Terms</h2>
              <p className="text-text-muted leading-relaxed">
                By accessing or using {companyName} (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                If you do not agree to these Terms, you may not access or use the Service. We reserve the right to update
                these Terms at any time, and your continued use of the Service constitutes acceptance of any modifications.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">2. Description of Service</h2>
              <p className="text-text-muted leading-relaxed">
                {companyName} is a tire shop management software platform that provides tools for managing work orders,
                inventory, customers, appointments, and business analytics. The Service is provided on a subscription
                basis and includes features such as:
              </p>
              <ul className="list-disc list-inside text-text-muted mt-3 space-y-2">
                <li>Work order creation and tracking</li>
                <li>Inventory management</li>
                <li>Customer relationship management</li>
                <li>Appointment scheduling</li>
                <li>Invoice generation</li>
                <li>Business analytics and reporting</li>
                <li>Team management and role-based access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">3. Account Registration</h2>
              <p className="text-text-muted leading-relaxed">
                To use the Service, you must create an account and provide accurate, complete, and current information.
                You are responsible for maintaining the confidentiality of your account credentials and for all activities
                that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">4. Subscription and Payment</h2>
              <p className="text-text-muted leading-relaxed mb-3">
                Access to the Service requires a paid subscription. By subscribing, you agree to pay all applicable
                fees as described in our pricing plans. Key payment terms include:
              </p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li>Subscriptions are billed monthly or annually in advance</li>
                <li>All fees are non-refundable unless otherwise stated</li>
                <li>We may change pricing with 30 days notice</li>
                <li>Failed payments may result in service suspension</li>
                <li>You are responsible for all applicable taxes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">5. Acceptable Use</h2>
              <p className="text-text-muted leading-relaxed mb-3">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-text-muted space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Transmit malware, viruses, or harmful code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the Service to send spam or unsolicited communications</li>
                <li>Resell, sublicense, or redistribute the Service without permission</li>
                <li>Reverse engineer or attempt to extract source code</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">6. Data Ownership and Privacy</h2>
              <p className="text-text-muted leading-relaxed">
                You retain ownership of all data you submit to the Service (&quot;Your Data&quot;). By using the Service,
                you grant us a limited license to use Your Data solely to provide and improve the Service. We will
                handle Your Data in accordance with our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                You are responsible for ensuring you have the right to submit any data you provide to the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">7. Intellectual Property</h2>
              <p className="text-text-muted leading-relaxed">
                The Service and all related materials, including but not limited to software, designs, text, graphics,
                and logos, are owned by {companyName} or its licensors and are protected by intellectual property laws.
                Your subscription grants you a limited, non-exclusive, non-transferable license to use the Service for
                your internal business purposes only.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">8. Service Availability</h2>
              <p className="text-text-muted leading-relaxed">
                We strive to maintain high availability of the Service but do not guarantee uninterrupted access.
                The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our
                control. We will make reasonable efforts to provide advance notice of scheduled maintenance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">9. Limitation of Liability</h2>
              <p className="text-text-muted leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
                WHETHER INCURRED DIRECTLY OR INDIRECTLY. OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR
                RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS
                PRECEDING THE CLAIM.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">10. Disclaimer of Warranties</h2>
              <p className="text-text-muted leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR
                REQUIREMENTS OR THAT IT WILL BE ERROR-FREE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">11. Indemnification</h2>
              <p className="text-text-muted leading-relaxed">
                You agree to indemnify, defend, and hold harmless {companyName} and its officers, directors, employees,
                and agents from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees)
                arising from your use of the Service, your violation of these Terms, or your violation of any
                rights of a third party.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">12. Termination</h2>
              <p className="text-text-muted leading-relaxed">
                Either party may terminate this agreement at any time. You may cancel your subscription through
                your account settings. We may suspend or terminate your access to the Service immediately if you
                violate these Terms. Upon termination, your right to use the Service will cease, and we may delete
                Your Data after a reasonable retention period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">13. Governing Law</h2>
              <p className="text-text-muted leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
                United States, without regard to its conflict of law provisions. Any disputes arising under these
                Terms shall be resolved in the state or federal courts located in Delaware.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">14. Changes to Terms</h2>
              <p className="text-text-muted leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes
                by email or through the Service. Your continued use of the Service after such modifications
                constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-4">15. Contact Information</h2>
              <p className="text-text-muted leading-relaxed">
                If you have any questions about these Terms, please contact us at:{' '}
                <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">
                  {companyEmail}
                </a>
              </p>
            </section>

            <div className="mt-12 pt-6 border-t border-border-muted">
              <p className="text-text-muted text-sm">
                By using {companyName}, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
