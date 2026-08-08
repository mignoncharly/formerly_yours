import type { Metadata } from "next";
import { LegalPage, Section, P, List, ReviewNotice, operatorLine, operatorAddress, OPERATOR } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Once Was Yours.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="8 August 2026"
      intro={
        <P>
          These Terms govern your use of Once Was Yours (the “Service”), operated
          by {operatorLine()}, {operatorAddress()} (“we”, “us”). By creating an
          account or using the Service you agree to these Terms. If you do not
          agree, do not use the Service.
        </P>
      }
    >
      <ReviewNotice />

      <Section heading="1. Who we are, and what Once Was Yours is">
        <P>
          Once Was Yours is a story-commerce marketplace where people sell
          pre-owned objects together with the story behind them. We provide the
          platform that connects buyers and sellers; <strong>we are not the
          buyer or the seller</strong> in any transaction and are not a party to
          the contract of sale between users.
        </P>
      </Section>

      <Section heading="2. Eligibility and your account">
        <List
          items={[
            "You must be at least 18 years old and able to form a binding contract.",
            "You are responsible for the accuracy of your account details and for keeping your credentials secure.",
            "You are responsible for all activity that happens under your account.",
            "One person may not maintain accounts to evade suspension or impersonate others.",
          ]}
        />
      </Section>

      <Section heading="3. Listings and prohibited items">
        <P>
          Sellers are responsible for their listings being accurate, lawful, and
          for having the right to sell the item. You may not list:
        </P>
        <List
          items={[
            "illegal, stolen, counterfeit, or recalled goods;",
            "weapons, drugs, hazardous materials, or regulated items you are not licensed to sell;",
            "items that infringe another person’s intellectual property;",
            "anything that violates applicable law or these Terms.",
          ]}
        />
      </Section>

      <Section heading="4. Stories, content, and other people’s privacy">
        <P>
          Our core rule is <strong>“Tell your story. Never expose theirs.”</strong>{" "}
          Stories and images must not reveal personal data about identifiable
          third parties (names, faces, addresses, contact details, or other
          private information) without their consent. You retain ownership of the
          content you post; you grant us a worldwide, non-exclusive, royalty-free
          licence to host, display, and distribute it for the purpose of
          operating and promoting the Service. You are responsible for your
          content and warrant that you have the rights to it.
        </P>
      </Section>

      <Section heading="5. Payments, fees, and payouts">
        <P>
          Payments are processed by <strong>Stripe</strong>. By transacting you
          also agree to the applicable Stripe terms. Sellers receive payouts via
          Stripe Connect and are responsible for providing accurate payout and
          tax information. Where we charge a service fee, it is shown before you
          confirm. Prices are in the currency displayed and are stored to the
          exact minor unit. You are responsible for any taxes on your sales.
        </P>
      </Section>

      <Section heading="6. Offers, purchases, and delivery">
        <List
          items={[
            "An accepted offer or completed checkout forms a contract of sale between buyer and seller.",
            "Sellers must ship promptly and provide tracking where offered; buyers must provide an accurate delivery address.",
            "Risk and title pass as required by applicable consumer law in the buyer’s jurisdiction.",
          ]}
        />
      </Section>

      <Section heading="7. Cancellations, returns, and disputes">
        <P>
          Consumer buyers may have statutory cancellation/return rights depending
          on their jurisdiction. Disputes between buyers and sellers should first
          be raised through the in-app messaging and dispute tools. We may, but
          are not obliged to, help mediate. Chargebacks and refunds are handled
          in line with Stripe’s processes.
        </P>
      </Section>

      <Section heading="8. Prohibited conduct">
        <List
          items={[
            "No fraud, harassment, hate speech, or unlawful activity.",
            "No circumventing fees or taking transactions off-platform to avoid protections.",
            "No scraping, reverse engineering, or interfering with the Service’s security.",
            "No uploading malware or attempting unauthorised access.",
          ]}
        />
      </Section>

      <Section heading="9. Moderation, suspension, and termination">
        <P>
          The database is our source of truth for authorisation, and we enforce
          these Terms through moderation. We may remove content, limit features,
          or suspend or terminate accounts that violate these Terms or the law.
          You may close your account at any time from your account settings.
        </P>
      </Section>

      <Section heading="10. Disclaimers and limitation of liability">
        <P>
          The Service is provided “as is”. To the maximum extent permitted by
          law, we are not liable for the acts, items, or content of other users,
          and our aggregate liability is limited as permitted by applicable law.
          Nothing in these Terms limits liability that cannot be limited by law
          (including your non-waivable consumer rights).
        </P>
      </Section>

      <Section heading="11. Changes, governing law, and contact">
        <P>
          We may update these Terms; material changes will be notified in-app or
          by email, and continued use means acceptance. These Terms are governed
          by the laws of {OPERATOR.jurisdiction}, without prejudice to mandatory
          consumer protections in your country of residence. Questions:{" "}
          <a className="text-[var(--color-primary-2)]" href={`mailto:${OPERATOR.contactEmail}`}>
            {OPERATOR.contactEmail}
          </a>
          . See also our{" "}
          <a className="text-[var(--color-primary-2)]" href="/impressum">
            Impressum
          </a>
          .
        </P>
      </Section>
    </LegalPage>
  );
}
