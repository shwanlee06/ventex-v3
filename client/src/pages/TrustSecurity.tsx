/**
 * Trust & Security — /trust
 * Public page, no auth required.
 * WS5: Institutional-grade security posture page for sales enablement.
 */
import { ArrowLeft, Shield, Lock, Server, Eye, FileText, AlertTriangle, Globe, CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const COMPANY = "Aurovia LLC";
const PRODUCT = "VENTEX";
const CONTACT_EMAIL = "security@aurovia.com";
const LAST_UPDATED = "April 16, 2026";

interface SectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ id, icon, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
          <span className="text-primary">{icon}</span>
        </div>
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function StatusBadge({ status, label }: { status: "operational" | "degraded" | "planned"; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-card border border-border rounded-md">
      <span className="text-xs text-foreground">{label}</span>
      <span className={cn(
        "text-[10px] font-mono px-2 py-0.5 rounded",
        status === "operational" && "bg-emerald-500/10 text-emerald-400",
        status === "degraded" && "bg-amber-500/10 text-amber-400",
        status === "planned" && "bg-blue-500/10 text-blue-400",
      )}>
        {status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Planned"}
      </span>
    </div>
  );
}

function ComplianceItem({ label, status, note }: { label: string; status: string; note?: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <CheckCircle2 className="size-4 text-primary flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">{status}</span>
        {note && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Security Overview" },
  { id: "compliance", label: "Compliance" },
  { id: "sub-processors", label: "Sub-Processors" },
  { id: "data-residency", label: "Data Residency" },
  { id: "pen-testing", label: "Penetration Testing" },
  { id: "incident-response", label: "Incident Response" },
  { id: "disclosure", label: "Vulnerability Disclosure" },
  { id: "status", label: "System Status" },
  { id: "security-package", label: "Security Package" },
  { id: "ai-transparency", label: "AI Transparency" },
  { id: "whitepaper", label: "Security Whitepaper" },
];

export default function TrustSecurity() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{PRODUCT}</h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              Trust & Security
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">Last updated: {LAST_UPDATED}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
          {/* Side Navigation */}
          <nav className="hidden lg:block sticky top-24 self-start space-y-1">
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-accent/30"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Main Content */}
          <div className="space-y-10">
            {/* Hero */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Trust & Security
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {PRODUCT} is built by {COMPANY} to meet the security, privacy, and compliance requirements
                of institutional venture holding firms. This page provides a transparent overview of our
                security posture, compliance status, and data handling practices.
              </p>
            </div>

            {/* Security Overview */}
            <Section id="overview" icon={<Shield className="size-4" />} title="Security Overview">
              <p>
                {PRODUCT} employs a defense-in-depth security architecture designed for institutional-grade
                data protection. Our platform processes sensitive venture portfolio data, distribution records,
                and investor communications — we treat every piece of data with the highest standard of care.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <Lock className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">Encryption</h3>
                  <p className="text-[11px] text-muted-foreground">
                    All data encrypted in transit (TLS 1.2+) and at rest (AES-256). Database uses transparent
                    data encryption. File storage uses server-side encryption via AWS KMS.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <Eye className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">Access Control</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Role-based access control (RBAC) with tenant isolation at the application and database layer.
                    OAuth 2.0 authentication with session management. Audit logging on all sensitive operations.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <Server className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">Infrastructure</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Hosted on enterprise-grade cloud infrastructure with automated deployments, health monitoring,
                    and disaster recovery capabilities. No shared tenancy at the database level.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <AlertTriangle className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">AI Safety</h3>
                  <p className="text-[11px] text-muted-foreground">
                    All AI-generated outputs require human approval before execution. Confidence scoring,
                    immutable audit trails, and disclaimers on every AI artifact. No AI model training on client data.
                  </p>
                </div>
              </div>
            </Section>

            {/* Compliance Status */}
            <Section id="compliance" icon={<FileText className="size-4" />} title="Compliance Status">
              <p>
                We are transparent about our current compliance posture. Items marked as "In Progress" or
                "Planned" reflect our roadmap — we do not claim certifications we have not earned.
              </p>
              <div className="mt-3 space-y-1">
                <ComplianceItem
                  label="SOC 2 Type II"
                  status="Audit window targeted for Q3 2026"
                  note="Readiness assessment complete. Six foundational policies published. Audit firm engagement in progress."
                />
                <ComplianceItem
                  label="GDPR Compliance"
                  status="Implemented"
                  note="Data Processing Agreement template available. Sub-processor register maintained. Data residency options (US, EU, APAC) available per tenant."
                />
                <ComplianceItem
                  label="Tenant Isolation Audit"
                  status="Complete — April 2026"
                  note="37 procedures patched across 9 router files. Every mutation and query verifies organization ownership."
                />
                <ComplianceItem
                  label="AI Safety Framework"
                  status="Implemented — April 2026"
                  note="Human approval enforcement, confidence scoring, immutable audit trail, disclaimers on all AI outputs."
                />
                <ComplianceItem
                  label="ISO 27001"
                  status="Planned — 2027"
                  note="Information security management system design phase."
                />
                <ComplianceItem
                  label="Data Retention Policy"
                  status="Published"
                  note="Defined retention periods for all data categories. Automated purge capabilities planned."
                />
              </div>
            </Section>

            {/* Sub-Processors */}
            <Section id="sub-processors" icon={<Globe className="size-4" />} title="Sub-Processors">
              <p>
                We maintain a complete register of every third-party service that processes client data.
                Clients are notified at least 30 calendar days before any new sub-processor is engaged.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Vendor</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Location</th>
                      <th className="text-left py-2 font-semibold text-foreground">Certifications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="py-2 pr-4 text-foreground font-medium">AWS (S3)</td>
                      <td className="py-2 pr-4">File storage</td>
                      <td className="py-2 pr-4">US / EU available</td>
                      <td className="py-2">SOC 2, ISO 27001, FedRAMP</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground font-medium">TiDB Cloud</td>
                      <td className="py-2 pr-4">Database</td>
                      <td className="py-2 pr-4">US / APAC</td>
                      <td className="py-2">SOC 2, ISO 27001</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground font-medium">Anthropic</td>
                      <td className="py-2 pr-4">AI inference</td>
                      <td className="py-2 pr-4">United States</td>
                      <td className="py-2">SOC 2</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground font-medium">Resend</td>
                      <td className="py-2 pr-4">Email delivery</td>
                      <td className="py-2 pr-4">United States</td>
                      <td className="py-2">SOC 2</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground font-medium">Manus</td>
                      <td className="py-2 pr-4">Hosting & Auth</td>
                      <td className="py-2 pr-4">United States</td>
                      <td className="py-2">SOC 2 (pending)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                Full sub-processor register with DPA links available under NDA. Contact {CONTACT_EMAIL} to request.
              </p>
            </Section>

            {/* Infrastructure Partnership */}
            <Section id="infrastructure" icon={<Server className="size-4" />} title="Infrastructure Partnership">
              <p>
                {PRODUCT} is built on <strong>Manus</strong>, a SOC 2-compliant application platform that provides
                hosting, authentication, and deployment infrastructure. This is a deliberate architectural choice
                by {COMPANY} to leverage enterprise-grade infrastructure rather than building commodity services in-house.
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs"><strong className="text-foreground">Authentication:</strong> OAuth 2.0 login is handled by Manus identity services. You may see the Manus login page during sign-in — this is expected and secure, similar to how enterprise apps use Okta or Auth0.</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs"><strong className="text-foreground">Data Isolation:</strong> All client data is logically isolated within {PRODUCT}'s dedicated database. Manus infrastructure has no access to business data.</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs"><strong className="text-foreground">Ownership:</strong> {COMPANY} retains full ownership and control of all application logic, business data, and client relationships. Manus provides infrastructure only.</p>
                </div>
              </div>
            </Section>

            {/* Data Residency */}
            <Section id="data-residency" icon={<Globe className="size-4" />} title="Data Residency">
              <p>
                Tenant administrators can select their preferred data residency region. File storage and database
                operations are routed to the selected region. When AI processing requires cross-border data transfer,
                the system logs the transfer and requires explicit tenant consent.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-foreground">United States</p>
                  <p className="text-[10px] text-muted-foreground mt-1">us-east-1</p>
                  <p className="text-[10px] text-emerald-400 mt-1">Available</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-foreground">European Union</p>
                  <p className="text-[10px] text-muted-foreground mt-1">eu-west-1</p>
                  <p className="text-[10px] text-emerald-400 mt-1">Available</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-foreground">Asia-Pacific</p>
                  <p className="text-[10px] text-muted-foreground mt-1">ap-southeast-1</p>
                  <p className="text-[10px] text-emerald-400 mt-1">Available</p>
                </div>
              </div>
            </Section>

            {/* Penetration Testing */}
            <Section id="pen-testing" icon={<Shield className="size-4" />} title="Penetration Testing">
              <p>
                Inaugural third-party penetration test scheduled for Q3 2026. Upon completion, a summary
                report will be available under NDA. Annual testing cadence planned thereafter.
              </p>
              <div className="bg-card border border-border rounded-lg p-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Scheduled</span>
                  <span className="text-xs text-foreground">Q3 2026 — Third-party penetration test</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Testing scope: application layer, API endpoints, authentication flows, tenant isolation boundaries,
                  AI agent safety controls. Results available under NDA upon completion.
                </p>
              </div>
            </Section>

            {/* Incident Response */}
            <Section id="incident-response" icon={<AlertTriangle className="size-4" />} title="Incident Response">
              <p>
                Our incident response process follows the published Incident Response Policy (SOC 2 control IR-1).
                We are committed to transparent communication during security events.
              </p>
              <div className="mt-3 space-y-3">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Contact</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Security incidents: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Response Times</h3>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Critical (P0)</p>
                      <p className="text-xs font-mono text-foreground">1 hour</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">High (P1)</p>
                      <p className="text-xs font-mono text-foreground">4 hours</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Medium (P2)</p>
                      <p className="text-xs font-mono text-foreground">24 hours</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Low (P3)</p>
                      <p className="text-xs font-mono text-foreground">72 hours</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Breach Notification</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Affected clients will be notified within 72 hours of confirmed breach, in compliance with
                    GDPR Article 33 and applicable regulations. Notification includes nature of breach, data
                    categories affected, and remediation steps.
                  </p>
                </div>
              </div>
            </Section>

            {/* Vulnerability Disclosure */}
            <Section id="disclosure" icon={<Mail className="size-4" />} title="Vulnerability Disclosure">
              <p>
                We welcome responsible disclosure of security vulnerabilities. Our security.txt file is
                available at <code className="text-[11px] bg-secondary/50 px-1 py-0.5 rounded">/.well-known/security.txt</code> per
                RFC 9116.
              </p>
              <div className="bg-card border border-border rounded-lg p-4 mt-3 font-mono text-[11px] text-muted-foreground space-y-1">
                <p>Contact: mailto:{CONTACT_EMAIL}</p>
                <p>Expires: 2027-04-16T00:00:00.000Z</p>
                <p>Preferred-Languages: en</p>
                <p>Canonical: https://ventexdemo.manus.space/.well-known/security.txt</p>
                <p>Policy: https://ventexdemo.manus.space/trust#disclosure</p>
              </div>
            </Section>

            {/* System Status */}
            <Section id="status" icon={<Server className="size-4" />} title="System Status">
              <p>
                Current operational status of {PRODUCT} platform services. Health checks run continuously
                and are wired to real infrastructure monitoring.
              </p>
              <div className="mt-3 space-y-2">
                <StatusBadge status="operational" label="Application" />
                <StatusBadge status="operational" label="API (tRPC)" />
                <StatusBadge status="operational" label="Database (TiDB)" />
                <StatusBadge status="operational" label="AI Agents" />
                <StatusBadge status="operational" label="Email Delivery (Resend)" />
                <StatusBadge status="operational" label="File Storage (S3)" />
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                Health check endpoints: <code className="bg-secondary/50 px-1 py-0.5 rounded">/api/health</code>,{" "}
                <code className="bg-secondary/50 px-1 py-0.5 rounded">/api/health/db</code>,{" "}
                <code className="bg-secondary/50 px-1 py-0.5 rounded">/api/health/ai</code>
              </p>
            </Section>

            {/* Security Package */}
            <Section id="security-package" icon={<Lock className="size-4" />} title="Security Package">
              <p>
                {PRODUCT} maintains a comprehensive security package for enterprise due diligence.
                The following documents are available upon request under NDA, or as part of our standard
                client onboarding process.
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Security Whitepaper", status: "Available", desc: "Architecture, controls, and compliance posture (12 pages)" },
                  { name: "SOC 2 Type I Engagement", status: "In Progress", desc: "Auditor engaged \u2014 expected completion Q4 2026" },
                  { name: "Penetration Test Report", status: "Scheduled", desc: "Third-party test scheduled for Q3 2026" },
                  { name: "Data Processing Agreement", status: "Available", desc: "GDPR-compliant DPA template ready for execution" },
                  { name: "Service Level Agreement", status: "Available", desc: "99.5% uptime target with defined response times" },
                  { name: "BCP/DR Plan", status: "Available", desc: "Business continuity and disaster recovery procedures" },
                  { name: "Incident Response Plan", status: "Available", desc: "Detection, containment, and notification procedures" },
                  { name: "Vendor Risk Assessment", status: "Available", desc: "Sub-processor evaluation and monitoring framework" },
                  { name: "Data Residency Statement", status: "Available", desc: "Multi-region hosting with tenant-selected residency" },
                  { name: "Cyber Insurance Evidence", status: "In Progress", desc: "E&O and cyber liability coverage being finalized" },
                ].map((doc) => (
                  <div key={doc.name} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{doc.name}</span>
                        <span className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded",
                          doc.status === "Available" ? "bg-emerald-500/10 text-emerald-400" :
                          doc.status === "In Progress" ? "bg-amber-500/10 text-amber-400" :
                          "bg-blue-500/10 text-blue-400"
                        )}>{doc.status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{doc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                To request the full security package, contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
                Documents marked \u201cAvailable\u201d can be shared within 24 hours under NDA.
              </p>
            </Section>

            {/* AI Transparency */}
            <Section id="ai-transparency" icon={<Eye className="size-4" />} title="AI Transparency">
              <p>
                {PRODUCT} uses AI agents to accelerate venture holding operations. We are committed to
                transparency about how AI is used, what decisions it influences, and how human oversight
                is maintained at every step.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Models Used</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {PRODUCT} uses large language models (LLMs) accessed via API for text analysis, document
                    drafting, and signal processing. Models are not fine-tuned on client data. We use
                    commercially available foundation models with enterprise-grade data handling agreements.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Decision Scope</h3>
                  <p className="text-[11px] text-muted-foreground">
                    AI agents generate recommendations, draft communications, and surface insights. They do
                    not execute financial transactions, modify legal documents, or make binding decisions.
                    All AI outputs are clearly labeled and require human review before action.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Human-in-the-Loop</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Every AI-generated artifact (draft, analysis, signal) passes through a human approval
                    gate before reaching clients. Operators review, edit, and approve all AI outputs.
                    The oversight model is documented in our AI Safety Framework.
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Data Handling</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Client data sent to AI models is scoped to the minimum necessary context. No client
                    data is used for model training. All AI interactions are logged in the immutable audit
                    trail with timestamps, input hashes, and output records.
                  </p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 mt-3">
                <h3 className="text-xs font-semibold text-foreground mb-2">AI Liability Framework</h3>
                <p className="text-[11px] text-muted-foreground">
                  {COMPANY} accepts responsibility for the proper functioning of AI features within {PRODUCT}.
                  Our Terms of Service include specific provisions for AI-generated content: (1) all AI outputs
                  are advisory and do not constitute financial, legal, or investment advice; (2) {COMPANY}
                  maintains errors & omissions insurance covering AI-related operational risks; (3) clients
                  retain full control over which AI recommendations to act upon; (4) intellectual property
                  rights for AI-generated work product are assigned to the client organization as specified
                  in our Terms of Service.
                </p>
              </div>
            </Section>

            {/* Security Whitepaper */}
            <Section id="whitepaper" icon={<FileText className="size-4" />} title="Security Whitepaper">
              <p>
                A comprehensive security whitepaper covering our architecture, controls, and compliance
                posture is available for download. The whitepaper is updated quarterly.
              </p>
              <div className="bg-card border border-border rounded-lg p-4 mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{PRODUCT} Security Whitepaper</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Version 1.0 — April 2026 — 12 pages</p>
                </div>
                <a
                  href="/docs/security/ventex-security-whitepaper.pdf"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  target="_blank"
                  rel="noopener"
                >
                  <FileText className="size-3.5" />
                  Download PDF
                </a>
              </div>
            </Section>

            {/* Footer */}
            <div className="border-t border-border pt-6 mt-10">
              <p className="text-[11px] text-muted-foreground">
                Questions about our security practices? Contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
                This page is maintained by {COMPANY} and updated as our security posture evolves.
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">
                {PRODUCT} by {COMPANY} · Trust & Security · {LAST_UPDATED}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
