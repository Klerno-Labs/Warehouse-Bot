import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Warehouse Builder",
  description: "Privacy Policy for Warehouse Builder",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl py-16 md:py-24">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: January 11, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Warehouse Builder (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our warehouse management service. Please read this policy
            carefully to understand our practices regarding your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-medium mb-3 mt-6">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Account Information:</strong> Name, email address, company name, phone number, and password when you register</li>
            <li><strong>Business Data:</strong> Inventory records, production orders, supplier information, and other operational data you enter into the system</li>
            <li><strong>Payment Information:</strong> Billing address and payment details (processed securely by our payment provider)</li>
            <li><strong>Communications:</strong> Messages you send to our support team or through the platform</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">2.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and interactions with the Service</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address</li>
            <li><strong>Cookies:</strong> Session and preference cookies to maintain your login and settings</li>
            <li><strong>Log Data:</strong> Server logs including access times, errors, and referring URLs</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Provide, maintain, and improve the Service</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative notifications, updates, and security alerts</li>
            <li>Respond to your comments, questions, and support requests</li>
            <li>Analyze usage patterns to enhance user experience</li>
            <li>Detect, prevent, and address technical issues and security threats</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (hosting, analytics, payment processing)</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>Legal Requirements:</strong> When required by law or to respond to legal process</li>
            <li><strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or property</li>
            <li><strong>With Your Consent:</strong> When you have given us explicit permission</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We implement appropriate technical and organizational measures to protect your data, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Encryption of data in transit (TLS/SSL) and at rest (AES-256)</li>
            <li>Regular security assessments and penetration testing</li>
            <li>Access controls and authentication requirements</li>
            <li>Employee training on data protection practices</li>
            <li>Incident response procedures</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            While we strive to protect your data, no method of transmission over the Internet is
            100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide the
            Service. After account termination, we retain data for up to 90 days to allow for
            reactivation or data export. Some data may be retained longer to comply with legal
            obligations, resolve disputes, or enforce agreements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Depending on your location, you may have the following rights:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your data</li>
            <li><strong>Portability:</strong> Request your data in a portable format</li>
            <li><strong>Objection:</strong> Object to certain processing of your data</li>
            <li><strong>Restriction:</strong> Request restriction of processing</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            To exercise these rights, contact us at privacy@warehousebuilder.com. We will respond
            within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Understand how you use the Service</li>
            <li>Improve performance and user experience</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            You can control cookies through your browser settings. Disabling certain cookies may
            affect the functionality of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your data may be transferred to and processed in countries other than your own. We
            ensure appropriate safeguards are in place for international transfers, including
            Standard Contractual Clauses approved by relevant authorities.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service is not intended for children under 16. We do not knowingly collect
            personal information from children. If you believe a child has provided us with
            personal information, please contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any
            material changes by posting the new policy on this page and updating the &quot;Last updated&quot;
            date. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions or concerns about this Privacy Policy or our data practices,
            please contact us:
          </p>
          <p className="text-muted-foreground mt-4">
            Email: privacy@warehousebuilder.com<br />
            Address: 123 Warehouse Way, Suite 100, Wilmington, DE 19801<br />
            Data Protection Officer: dpo@warehousebuilder.com
          </p>
        </section>
      </div>
    </div>
  );
}
