import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ | Suplymate",
  description:
    "Frequently asked questions about Suplymate, supplier verification, RFQs, quotes, pricing data, and reviews.",
};

const faqs = [
  {
    q: "What is Suplymate?",
    a: "Suplymate is an AI-powered B2B sourcing and procurement marketplace. It helps buyers discover suppliers, send requests for quote (RFQs), compare quotes, message suppliers, and view indicative market price information — all in one place.",
  },
  {
    q: "Is it free?",
    a: "You can create an account and explore the platform. Some features may be part of paid plans. Where billing is active, the available plans and what they include are described on our pricing page. If you have questions about plans or billing, email us at info@suplymate.com.",
  },
  {
    q: "How does supplier verification work?",
    a: "Verification is a manual process carried out by our admin team. A supplier is only marked \"Verified\" after manual checks — we do not automatically verify listings. Many suppliers in the directory are listings compiled from publicly available sources and have not been independently verified. A \"Verified\" status reflects our review process; it is not a warranty of quality, performance, or financial standing. See our Supplier Verification Policy for the full lifecycle and what each status means.",
  },
  {
    q: "How do RFQs and quotes work?",
    a: "When you find a supplier you want to engage, you send a Request for Quote (RFQ) describing what you need, the quantity, timeline, and any specifications. Suppliers can respond with quotes, which you can compare side by side. The quotes, prices, and terms are offered directly by the supplier — Suplymate facilitates the introduction and communication but is not a party to the transaction.",
  },
  {
    q: "How is pricing data sourced?",
    a: "Our market price intelligence is indicative and is sourced from public and third-party data. It is intended to provide context for your sourcing decisions. Suplymate is not a trading venue or exchange, and the figures shown should not be treated as live, executable, or guaranteed prices. Always confirm current pricing directly with suppliers.",
  },
  {
    q: "How do I claim my company profile?",
    a: "If your company appears as a directory listing, a representative can claim the profile so you can manage its information. To get started, contact us at info@suplymate.com from a company email address. We review claims before granting access. See the Supplier Verification Policy for details on the CLAIMED status and what follows.",
  },
  {
    q: "How are reviews handled?",
    a: "Reviews are only allowed after a qualifying interaction with the supplier on-platform, such as an RFQ, quote, or conversation. All reviews are moderated and may be pending, published, rejected, or removed. We do not allow incentivized or fake reviews, and we do not display fake \"verified purchase\" badges. See our Review Policy for how to report a review.",
  },
  {
    q: "Does Suplymate offer payment protection, escrow, or refunds?",
    a: "No. Suplymate does not currently process payments between buyers and suppliers and does not offer escrow, payment protection, or refunds for transactions arranged off-platform. Payment terms and any protections are arranged directly between buyer and supplier. Please do your own due diligence. See our Refund & Protection Policy for details.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Frequently asked questions
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Answers to the questions we hear most often. Can&apos;t find what you
        need? Visit our{" "}
        <Link
          href="/help"
          className="text-cyan transition-colors hover:text-teal"
        >
          Help Center
        </Link>{" "}
        or{" "}
        <Link
          href="/contact"
          className="text-cyan transition-colors hover:text-teal"
        >
          contact us
        </Link>
        .
      </p>

      <div className="mt-12 space-y-4">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors open:border-cyan/40"
          >
            <summary className="flex cursor-pointer items-center justify-between font-display text-lg font-semibold text-ink marker:content-['']">
              {faq.q}
              <span className="ml-4 text-cyan transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 leading-relaxed text-ink-muted">{faq.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-12 text-sm leading-relaxed text-ink-dim">
        Looking for our policies? Read the{" "}
        <Link
          href="/supplier-verification-policy"
          className="text-cyan transition-colors hover:text-teal"
        >
          Supplier Verification Policy
        </Link>
        ,{" "}
        <Link
          href="/review-policy"
          className="text-cyan transition-colors hover:text-teal"
        >
          Review Policy
        </Link>
        , and{" "}
        <Link
          href="/refund-and-protection-policy"
          className="text-cyan transition-colors hover:text-teal"
        >
          Refund &amp; Protection Policy
        </Link>
        .
      </p>
    </div>
  );
}
