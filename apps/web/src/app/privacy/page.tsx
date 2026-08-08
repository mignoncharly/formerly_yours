import type { Metadata } from "next";
import { LegalPage, Section, P, List, ReviewNotice } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Once Was Yours collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="8 August 2026"
      intro={
        <P>
          This policy explains what personal data Once Was Yours collects, why,
          and your rights under the EU/UK General Data Protection Regulation
          (GDPR). The data controller is [Legal entity name], [registered
          address] (“we”). For any privacy request, contact{" "}
          <a className="text-[var(--color-primary-2)]" href="mailto:privacy@gestionatech.de">
            privacy@gestionatech.de
          </a>
          .
        </P>
      }
    >
      <ReviewNotice />

      <Section heading="1. Data we collect">
        <List
          items={[
            "Account & profile: email address (via our auth provider), username, display name, optional bio, city, country, and avatar.",
            "Content you create: listings, stories, images, messages, offers, reactions, and comments.",
            "Transactions: order and payment metadata. Card details are handled directly by Stripe — we never see or store full card numbers.",
            "Notifications & email: in-app notifications and a record that a transactional email was sent (for deduplication and audit — not its full contents).",
            "Technical: log and error data, and — only if analytics is enabled — usage events. IP addresses may be processed transiently for security and rate-limiting.",
          ]}
        />
      </Section>

      <Section heading="2. How and why we use it (legal bases)">
        <List
          items={[
            "To provide the Service — create your account, show listings/stories, run messaging, offers, and checkout (performance of a contract, Art. 6(1)(b)).",
            "To process payments and payouts (contract, and legal obligation for tax/accounting, Art. 6(1)(b)/(c)).",
            "To send transactional email you haven’t opted out of, e.g. offer and sale notifications (legitimate interests / your consent, Art. 6(1)(f)/(a)).",
            "To keep the Service safe — moderation, fraud and abuse prevention, rate-limiting (legitimate interests, Art. 6(1)(f)).",
            "To improve the Service via aggregated analytics, only where enabled and with any required consent (consent/legitimate interests).",
          ]}
        />
      </Section>

      <Section heading="3. Who processes your data (sub-processors)">
        <P>We use vetted providers to run the Service:</P>
        <List
          items={[
            "Supabase — database, authentication, and file storage (hosted in the EU, eu-west-1).",
            "Stripe — payment processing and seller payouts.",
            "Zoho ZeptoMail — transactional email delivery (EU data centre).",
            "Sentry — error and performance monitoring (data may be processed in the US under appropriate safeguards; we filter out sensitive fields).",
            "PostHog — product analytics, only if enabled (EU host).",
            "IONOS — server hosting (Germany).",
          ]}
        />
        <P>
          Where data is transferred outside the EEA, we rely on appropriate
          safeguards such as Standard Contractual Clauses.
        </P>
      </Section>

      <Section heading="4. How long we keep it">
        <List
          items={[
            "Account and content: for as long as your account is active. Deleting your account removes your profile and cascades to your associated records.",
            "Read notifications: automatically pruned after 90 days.",
            "Transactional-email audit records: automatically pruned after 180 days.",
            "Transaction records: retained as required for legal, tax, and accounting obligations.",
          ]}
        />
      </Section>

      <Section heading="5. Your rights">
        <P>Subject to law, you have the right to:</P>
        <List
          items={[
            "access the personal data we hold about you;",
            "rectify inaccurate data (much of it is editable in your account settings);",
            "erase your data — you can delete your account yourself from settings, or ask us;",
            "restrict or object to certain processing;",
            "data portability;",
            "withdraw consent at any time (e.g. turn off email categories in your account);",
            "lodge a complaint with your local data protection supervisory authority.",
          ]}
        />
      </Section>

      <Section heading="6. Email preferences and marketing">
        <P>
          In-app notifications are part of the Service. Transactional emails
          follow your preferences in <strong>Account → Email preferences</strong>,
          and we only email a verified address. We do not send marketing email
          without your consent.
        </P>
      </Section>

      <Section heading="7. Security">
        <P>
          Access to data is enforced at the database level (row-level security),
          the frontend never decides authorisation, and sensitive operations run
          through secured server functions. We use TLS in transit. No system is
          perfectly secure, but we take reasonable measures to protect your data.
        </P>
      </Section>

      <Section heading="8. Children">
        <P>The Service is not directed to anyone under 18, and we do not knowingly collect their data.</P>
      </Section>

      <Section heading="9. Cookies and similar technologies">
        <P>
          We use strictly necessary cookies for authentication and security.
          Analytics, where enabled, uses its own identifiers and is only
          activated with any legally required consent.
        </P>
      </Section>

      <Section heading="10. Changes and contact">
        <P>
          We may update this policy; material changes will be notified in-app or
          by email. For any request or question, contact{" "}
          <a className="text-[var(--color-primary-2)]" href="mailto:privacy@gestionatech.de">
            privacy@gestionatech.de
          </a>
          .
        </P>
      </Section>
    </LegalPage>
  );
}
