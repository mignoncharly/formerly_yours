import type { Metadata } from "next";
import { LegalPage, Section, P, ReviewNotice, OPERATOR } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Impressum / Legal Notice",
  description: "Legal notice (Impressum) for Once Was Yours under § 5 DDG.",
};

export default function ImpressumPage() {
  return (
    <LegalPage
      title="Impressum / Legal Notice"
      lastUpdated="8 August 2026"
      intro={<P>Information pursuant to § 5 DDG (German Digital Services Act).</P>}
    >
      <ReviewNotice />

      <Section heading="Provider (Diensteanbieter)">
        <P>
          {OPERATOR.legalName}
          <br />
          trading as “{OPERATOR.tradingAs}” (sole proprietor / Einzelunternehmen)
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.city}
          <br />
          {OPERATOR.country}
        </P>
      </Section>

      <Section heading="Contact (Kontakt)">
        <P>
          Email:{" "}
          <a className="text-[var(--color-primary-2)]" href={`mailto:${OPERATOR.contactEmail}`}>
            {OPERATOR.contactEmail}
          </a>
          <br />
          We also respond through in-app messaging on Once Was Yours.
        </P>
      </Section>

      <Section heading="VAT identification number (Umsatzsteuer-ID)">
        <P>
          VAT ID pursuant to § 27a of the German VAT Act (UStG):{" "}
          <strong>{OPERATOR.vatId}</strong>
        </P>
      </Section>

      <Section heading="Responsible for content (§ 18 Abs. 2 MStV)">
        <P>
          {OPERATOR.legalName}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}
        </P>
      </Section>

      <Section heading="Consumer dispute resolution (Verbraucherstreitbeilegung)">
        <P>
          We are neither obliged nor willing to participate in dispute-resolution
          proceedings before a consumer arbitration board (Verbraucherschlichtungs&shy;stelle)
          within the meaning of § 36 VSBG. (Note: the European Commission&rsquo;s
          Online Dispute Resolution platform was discontinued in 2025.)
        </P>
      </Section>

      <Section heading="Liability for content (Haftung für Inhalte)">
        <P>
          As a service provider we are responsible for our own content on these
          pages under general law (§ 7(1) DDG). Under §§ 8–10 DDG, however, we are
          not obliged to monitor transmitted or stored third-party information, or
          to investigate circumstances that indicate unlawful activity. Obligations
          to remove or block the use of information under general law remain
          unaffected; we act promptly to remove such content once we become aware
          of a specific infringement.
        </P>
      </Section>

      <Section heading="Liability for links (Haftung für Links)">
        <P>
          Our pages may contain links to external third-party websites over whose
          content we have no control. We accept no liability for that external
          content; the respective provider or operator of the linked pages is
          always responsible for it. We will remove such links promptly if we
          become aware of any legal infringement.
        </P>
      </Section>

      <Section heading="Copyright (Urheberrecht)">
        <P>
          Content created by the operator on these pages is subject to German
          copyright law. Contributions by third parties (for example user stories,
          listings and images) remain the property of their respective authors.
          Reproduction, editing, distribution, or any kind of exploitation beyond
          the limits of copyright requires the prior written consent of the
          respective author or creator.
        </P>
      </Section>
    </LegalPage>
  );
}
