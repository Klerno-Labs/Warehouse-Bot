import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Warehouse Builder",
  description: "Terms of Service for Warehouse Builder",
};

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-16 md:py-24">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: January 11, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using Warehouse Builder (&quot;the Service&quot;), you agree to be bound by these
            Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or
            use the Service. These Terms apply to all visitors, users, and others who access or use
            the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            Warehouse Builder is a cloud-based warehouse management system that provides inventory
            tracking, production management, team collaboration, and analytics tools. The Service
            is provided &quot;as is&quot; and we reserve the right to modify, suspend, or discontinue the
            Service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            To use the Service, you must create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Maintain the security of your password and account</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on the rights of others</li>
            <li>Transmit malicious code or interfere with the Service</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Resell or redistribute the Service without authorization</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Data and Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your use of the Service is also governed by our Privacy Policy. You retain ownership
            of any data you submit to the Service. By using the Service, you grant us a limited
            license to use, store, and process your data solely for the purpose of providing the
            Service. We implement industry-standard security measures to protect your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Subscription and Payment</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Some features of the Service require a paid subscription. By subscribing, you agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Pay all applicable fees as described at the time of purchase</li>
            <li>Provide valid payment information</li>
            <li>Authorize us to charge your payment method on a recurring basis</li>
            <li>Accept that fees are non-refundable except as required by law</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We reserve the right to change our pricing with 30 days&apos; notice. You may cancel your
            subscription at any time, effective at the end of your current billing period.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service and its original content, features, and functionality are owned by
            Warehouse Builder and are protected by international copyright, trademark, patent,
            trade secret, and other intellectual property laws. You may not copy, modify,
            distribute, sell, or lease any part of our Service without explicit written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, Warehouse Builder shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including without
            limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting
            from your access to or use of or inability to access or use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Warehouse Builder
            expressly disclaims all warranties of any kind, whether express or implied, including
            but not limited to implied warranties of merchantability, fitness for a particular
            purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may terminate or suspend your account and access to the Service immediately, without
            prior notice or liability, for any reason, including if you breach these Terms. Upon
            termination, your right to use the Service will cease immediately. You may request
            export of your data within 30 days of termination.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify these Terms at any time. We will provide notice of
            significant changes by posting the new Terms on this page and updating the &quot;Last updated&quot;
            date. Your continued use of the Service after such changes constitutes acceptance of
            the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the
            State of Delaware, United States, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="text-muted-foreground mt-2">
            Email: legal@warehousebuilder.com<br />
            Address: 123 Warehouse Way, Suite 100, Wilmington, DE 19801
          </p>
        </section>
      </div>
    </div>
  );
}
