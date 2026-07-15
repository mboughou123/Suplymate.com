import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Suplymate",
  description:
    "The terms that govern your use of the Suplymate platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-ink-dim">Last updated: June 2026</p>
      <p className="mt-6 leading-relaxed text-ink-muted">
        These Terms of Service govern your access to and use of the Suplymate
        platform. By using Suplymate, you agree to these terms. If you do not
        agree, please do not use the platform.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Suplymate is a marketplace and intermediary
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Suplymate is a marketplace that connects buyers and suppliers. We do
          not manufacture, sell, or supply goods ourselves, and we are not a
          party to any transaction between a buyer and a supplier. Any agreement
          for the purchase or sale of goods or services is solely between the
          buyer and the supplier.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Acceptable use
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          You agree to use the platform lawfully and in good faith. You will not
          misuse the platform, including by submitting false or misleading
          information, posting fake reviews, infringing the rights of others,
          attempting to gain unauthorized access, scraping or harvesting data
          beyond what is permitted, or using the platform to send spam or
          unlawful content.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Supplier listings and &ldquo;Verified&rdquo; status
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Supplier listings include profiles managed by suppliers and directory
          entries compiled from publicly available sources. A
          &ldquo;Verified&rdquo; status reflects that a supplier has passed
          Suplymate&apos;s review process at a point in time; it is{" "}
          <strong className="text-ink">not a warranty or guarantee</strong> of a
          supplier&apos;s quality, reliability, performance, or financial
          standing. Many listings are not independently verified. You are
          responsible for conducting your own due diligence before entering into
          any transaction. See our{" "}
          <Link
            href="/supplier-verification-policy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Supplier Verification Policy
          </Link>{" "}
          for details.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          RFQs, quotes, and transactions
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Requests for quote, quotes, and related communications are exchanged
          directly between buyers and suppliers. Suplymate does not guarantee
          the accuracy of any quote, the availability of any product, or the
          performance of any supplier. We do not currently process payments
          between buyers and suppliers, and we do not provide escrow, payment
          protection, or refunds for off-platform transactions. See our{" "}
          <Link
            href="/refund-and-protection-policy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Refund &amp; Protection Policy
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Market price information
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Any market or material price information shown on the platform is
          indicative only, is drawn from public and third-party sources, and may
          not be current or accurate. Suplymate is not a trading venue. You
          should not rely on this information as the sole basis for a purchasing
          decision.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Limitation of liability
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          To the maximum extent permitted by law, Suplymate is provided
          &ldquo;as is&rdquo; without warranties of any kind. We are not liable
          for any indirect, incidental, special, or consequential damages, or
          for any losses arising from your dealings with suppliers or buyers,
          your reliance on listings or price information, or the unavailability
          of the platform.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Changes and termination
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We may update these terms from time to time; the &ldquo;Last
          updated&rdquo; date above reflects the latest version. We may suspend
          or terminate access to the platform if these terms are violated or if
          necessary to protect the platform and its users.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Contact</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Questions about these terms? Email us at{" "}
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
