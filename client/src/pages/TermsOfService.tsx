/**
 * Terms of Service — /terms
 * Public page, no auth required.
 * Styled to match the ATLAS Swiss-instrument design system.
 */

import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const EFFECTIVE_DATE = "April 8, 2026";
const COMPANY = "Royalton Venture Holding";
const PRODUCT = "ATLAS";
const CONTACT_EMAIL = "legal@aurovia.co";

export default function TermsOfService() {
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
              Terms of Service
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Terms of Service</h2>
          <p className="text-xs text-muted-foreground font-mono">
            Effective Date: {EFFECTIVE_DATE}
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">1. Acceptance of Terms</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using the {PRODUCT} platform operated by {COMPANY}, you agree to be
            bound by these Terms of Service. If you do not agree to these terms, you may not use
            the platform. If you are using the platform on behalf of an organization, you represent
            that you have the authority to bind that organization to these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">2. Description of Service</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {PRODUCT} is an AI-powered venture holding management platform that provides: venture
            lifecycle management and tracking; SPV and deal pipeline management; automated task
            orchestration and agent-driven workflows; document management and blueprint extraction;
            distribution tracking and reporting; client portal access; and team collaboration tools.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">3. User Accounts</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials,
            including any multi-factor authentication devices. You must immediately notify us of
            any unauthorized use of your account. You are responsible for all activities that occur
            under your account. We reserve the right to suspend or terminate accounts that violate
            these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">4. Acceptable Use</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You agree not to: (a) use the platform for any unlawful purpose; (b) attempt to gain
            unauthorized access to other users' data or accounts; (c) interfere with or disrupt
            the platform's infrastructure; (d) upload malicious code, viruses, or harmful content;
            (e) reverse engineer, decompile, or disassemble any part of the platform; (f) use
            automated tools to scrape or extract data beyond authorized API usage; (g) share your
            account credentials with unauthorized parties; or (h) violate any applicable laws or
            regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">5. Data Ownership</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You retain all ownership rights to the data you input into the platform, including
            venture information, financial data, documents, and business records. We do not claim
            ownership of your data. We use your data solely to provide and improve the platform
            services as described in our Privacy Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">6. AI-Generated Content</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The platform uses artificial intelligence to generate insights, recommendations, draft
            communications, and automated workflows. AI-generated content is provided for
            informational purposes and should be reviewed by qualified professionals before acting
            upon it. We do not guarantee the accuracy, completeness, or suitability of AI-generated
            content for any particular purpose.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">7. Confidentiality</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We treat all business data stored on the platform as confidential. We implement
            cross-tenant isolation to ensure that one organization's data is not accessible to
            another. Our security measures include encryption at rest and in transit, role-based
            access controls, and comprehensive audit logging.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">8. Service Availability</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We strive to maintain high availability of the platform but do not guarantee
            uninterrupted access. We may perform scheduled maintenance with advance notice. We are
            not liable for any downtime, data loss, or service interruptions caused by factors
            beyond our reasonable control.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">9. Limitation of Liability</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY} SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF
            THE PLATFORM. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE
            SERVICES IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">10. Indemnification</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You agree to indemnify and hold harmless {COMPANY}, its officers, directors, employees,
            and agents from any claims, damages, losses, or expenses arising from: (a) your use of
            the platform; (b) your violation of these terms; (c) your violation of any third-party
            rights; or (d) any content you submit to the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">11. Termination</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Either party may terminate this agreement at any time. Upon termination, your right to
            access the platform ceases immediately. We will retain your data for a reasonable
            period to allow data export, after which it will be deleted in accordance with our Data
            Retention Policy. Provisions that by their nature should survive termination will
            remain in effect.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">12. Governing Law</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which {COMPANY} is incorporated, without regard to conflict of law
            principles. Any disputes arising from these terms shall be resolved through binding
            arbitration.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">13. Changes to Terms</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to modify these Terms at any time. Material changes will be
            communicated through the platform or via email. Continued use of the platform after
            changes take effect constitutes acceptance of the modified terms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">14. Contact</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these Terms of Service, contact us at:{" "}
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
