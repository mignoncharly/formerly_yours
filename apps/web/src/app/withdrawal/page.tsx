import type { Metadata } from "next";
import { LegalPage, Section, P, List, ReviewNotice, OPERATOR, operatorAddress } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Right of Withdrawal & Returns",
  description:
    "Consumer right of withdrawal (Widerrufsbelehrung) for first-party sales on Once Was Yours.",
};

export default function WithdrawalPage() {
  return (
    <LegalPage
      title="Right of Withdrawal & Returns"
      lastUpdated="8 August 2026"
      intro={
        <P>
          Statutory consumer right of withdrawal for distance contracts
          (Widerrufsbelehrung).
        </P>
      }
    >
      <ReviewNotice />

      <Section heading="When this applies">
        <P>
          Most items on Once Was Yours are sold by <strong>private individuals</strong>.
          The statutory right of withdrawal is a <strong>consumer</strong> right
          against a <strong>trader</strong>, so it generally does{" "}
          <strong>not</strong> apply to purchases from a private seller. This
          policy governs <strong>first-party sales</strong> only — i.e. purchases
          where the seller is the operator of Once Was Yours ({OPERATOR.legalName},
          trading as “{OPERATOR.tradingAs}”) acting as a trader. Your separate
          rights against private sellers (e.g. for items not as described) are
          unaffected.
        </P>
      </Section>

      <Section heading="Right of withdrawal">
        <P>
          You have the right to withdraw from the contract within{" "}
          <strong>14 days</strong> without giving any reason. The withdrawal
          period is 14 days from the day on which you — or a third party named by
          you, other than the carrier — take possession of the goods (for an order
          delivered in several parts, from the day the last item is received).
        </P>
      </Section>

      <Section heading="How to exercise it">
        <P>
          To exercise the right of withdrawal, you must inform us of your decision
          by a clear statement (for example, a letter sent by post or an email):
        </P>
        <P>
          {OPERATOR.legalName}, trading as “{OPERATOR.tradingAs}”
          <br />
          {operatorAddress()}
          <br />
          Email:{" "}
          <a className="text-[var(--color-primary-2)]" href={`mailto:${OPERATOR.contactEmail}`}>
            {OPERATOR.contactEmail}
          </a>
        </P>
        <P>
          You may use the model withdrawal form below, but it is not obligatory.
          To meet the withdrawal deadline, it is sufficient to send your
          communication before the 14-day period has expired.
        </P>
      </Section>

      <Section heading="Effects of withdrawal">
        <List
          items={[
            "We reimburse all payments received from you, including the standard delivery costs (except any extra costs arising from your choice of a delivery type other than the cheapest standard delivery we offer), without undue delay and within 14 days of being informed of your withdrawal.",
            "We make the reimbursement using the same means of payment you used, unless expressly agreed otherwise; you will not incur any fees for it.",
            "We may withhold reimbursement until we have received the goods back, or you have supplied proof of having sent them back, whichever is earlier.",
            "You must send back or hand over the goods without undue delay and in any event within 14 days of notifying us of your withdrawal.",
            "You bear the direct cost of returning the goods.",
            "You are only liable for any diminished value of the goods resulting from handling other than what is necessary to establish their nature, characteristics, and functioning.",
          ]}
        />
      </Section>

      <Section heading="Exclusions">
        <P>
          The right of withdrawal does not apply to certain contracts under
          § 312g(2) BGB — in particular goods made to your specifications or
          clearly personalised, sealed goods unsealed after delivery that are not
          suitable for return for reasons of health protection or hygiene, and
          goods that were inseparably mixed with other items after delivery.
        </P>
      </Section>

      <Section heading="Model withdrawal form">
        <P>
          (Complete and return this form only if you wish to withdraw from the
          contract.)
        </P>
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-sm">
          <P>
            To {OPERATOR.legalName}, trading as “{OPERATOR.tradingAs}”,{" "}
            {operatorAddress()}, {OPERATOR.contactEmail}:
          </P>
          <P>
            — I/we (*) hereby give notice that I/we (*) withdraw from my/our (*)
            contract of sale of the following goods (*):
          </P>
          <P>— Ordered on (*) / received on (*):</P>
          <P>— Name of consumer(s):</P>
          <P>— Address of consumer(s):</P>
          <P>— Signature of consumer(s) (only if this form is notified on paper):</P>
          <P>— Date:</P>
          <P>(*) Delete as appropriate.</P>
        </div>
      </Section>
    </LegalPage>
  );
}
