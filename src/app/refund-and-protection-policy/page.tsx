import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Protection Policy | Suplymate",
  description:
    "What Suplymate does and does not cover. We do not process payments, escrow, or refunds for transactions between buyers and suppliers.",
};

export default function RefundAndProtectionPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Refund &amp; Protection Policy
      </h1>
      <p className="mt-6 leading-relaxed text-ink-muted">
        We want to be completely clear about what Suplymate does and does not
        cover when it comes to payments and buyer protection. Please read this
        policy carefully before transacting with a supplier.
      </p>

      <section className="mt-10 rounded-2xl border border-mustard/40 bg-mustard/10 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          We do not process payments or offer protection
        </h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Suplymate does <strong className="text-ink">not</strong> currently
          process payments between buyers and suppliers. We do{" "}
          <strong className="text-ink">not</strong> offer escrow, payment
          protection, or refunds for transactions arranged between a buyer and a
          supplier. There is no buyer-protection program covering off-platform
          purchases.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Transactions are between buyer and supplier
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          All transactions, payment terms, delivery arrangements, warranties,
          and any protections are agreed and handled directly between the buyer
          and the supplier. Suplymate facilitates discovery and communication,
          but it is not a party to your transaction and does not hold or
          transfer funds on your behalf. Because of this, you should agree on
          clear terms with your supplier and conduct your own due diligence
          before sending payment. See our{" "}
          <Link
            href="/supplier-verification-policy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Supplier Verification Policy
          </Link>{" "}
          to understand what a supplier&apos;s status does and does not mean.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Suplymate subscription fees
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          This policy is separate from any subscription fees for the Suplymate
          platform itself. If and when billing is active, subscription fees are
          handled according to the applicable billing terms presented at the
          time of purchase. Questions about a Suplymate subscription charge can
          be sent to{" "}
          <a
            href="mailto:info@suplymate.com"
            className="text-cyan transition-colors hover:text-teal"
          >
            info@suplymate.com
          </a>{" "}
          and we will review them in line with those terms.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Reducing your risk
        </h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              Confirm supplier details, references, and documentation before
              committing to an order.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              Agree clear written terms covering price, quantity, lead time, and
              what happens if something goes wrong.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              Use payment methods and contractual protections that you and your
              own advisors are comfortable with.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Contact</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Questions about this policy? Email us at{" "}
          <a
            href="mailto:info@suplymate.com"
            className="text-cyan transition-colors hover:text-teal"
          >
            info@suplymate.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
