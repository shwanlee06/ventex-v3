/**
 * Privacy Policy — /privacy
 * Public page, no auth required.
 * Styled to match the VENTEX Swiss-instrument design system.
 */

import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const EFFECTIVE_DATE = "April 8, 2026";
const COMPANY = "Royalton Venture Holding";
const PRODUCT = "VENTEX";
const CONTACT_EMAIL = "privacy@aurovia.co";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{PRODUCT}</h1>
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
              Privacy Policy
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Privacy Policy</h2>
          <p className="text-xs text-muted-foreground font-mono">
            Effective Date: {EFFECTIVE_DATE}
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">1. Introduction</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {COMPANY} ("{PRODUCT}") is committed to protecting the privacy and security of your
            personal information. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our venture management platform and related
            services.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">2. Information We Collect</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Account Information:</strong> When you create an
            account, we collect your name, email address, organization name, and role. For
            administrators, we may also collect multi-factor authentication credentials (encrypted
            TOTP secrets).
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Usage Data:</strong> We automatically collect
            information about your interactions with the platform, including IP addresses, browser
            type, pages visited, features used, and timestamps. This data is stored in our audit
            and activity logs.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Business Data:</strong> Information you input about
            ventures, SPVs, distributions, tasks, and other business operations is stored securely
            and is accessible only to authorized members of your organization.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Files and Documents:</strong> Documents uploaded to
            the platform (blueprints, contracts, reports) are stored in encrypted cloud storage
            (AWS S3) and are accessible only to authorized users.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">3. How We Use Your Information</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use your information to: (a) provide, maintain, and improve the {PRODUCT} platform;
            (b) authenticate your identity and manage access controls; (c) send transactional
            communications (task notifications, stage advances, distribution notices); (d) generate
            AI-powered insights and recommendations for your ventures; (e) maintain audit trails
            for security and compliance purposes; and (f) detect and prevent fraud, abuse, or
            security incidents.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">4. Data Retention</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain your data according to our Data Retention Policy, which is designed to meet
            SOC 2 compliance requirements:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1 pl-2">
            <li>Audit logs: 365 days (regulatory minimum)</li>
            <li>Activity logs: 180 days</li>
            <li>Expired sessions: 30 days after expiry</li>
            <li>Agent events: 180 days (read events only; unread events preserved)</li>
            <li>Read notifications: 90 days</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Automated purging runs daily to enforce these retention periods. You may request
            deletion of your personal data at any time by contacting us.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">5. Data Security</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including: AES-256-GCM encryption for
            sensitive data at rest; TLS 1.2+ for data in transit; TOTP-based multi-factor
            authentication for administrative accounts; role-based access control (RBAC) with
            cross-tenant isolation; rate limiting on all sensitive endpoints; and comprehensive
            audit logging of all access and modifications.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">6. Data Sharing</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell your personal information. We may share data with: (a) service providers
            who assist in operating our platform (cloud hosting, email delivery, AI processing);
            (b) your organization's authorized administrators; (c) law enforcement when required by
            law or to protect our rights; and (d) in connection with a merger, acquisition, or sale
            of assets (with prior notice).
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">7. Your Rights</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Depending on your jurisdiction, you may have the right to: access your personal data;
            correct inaccurate data; request deletion of your data; restrict or object to
            processing; data portability; and withdraw consent. To exercise these rights, contact
            us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">8. Cookies and Tracking</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use essential cookies for authentication and session management. We use analytics
            to understand platform usage patterns. We do not use third-party advertising cookies
            or cross-site tracking technologies.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">9. International Data Transfers</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data may be processed in jurisdictions outside your country of residence. We
            ensure appropriate safeguards are in place for international transfers, including
            standard contractual clauses where applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">10. Changes to This Policy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the updated policy on this page and updating the effective date.
            Continued use of the platform after changes constitutes acceptance of the updated
            policy.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">11. Contact Us</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about this Privacy Policy or our data practices, contact us at:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-mono">
            &copy; {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
