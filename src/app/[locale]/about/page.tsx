import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Suplymate",
  description:
    "Suplymate is an AI-powered B2B sourcing and procurement marketplace that connects buyers with suppliers.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        About Suply<span className="gradient-text">mate</span>
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Suplymate is an AI-powered B2B sourcing and procurement marketplace. We
        help buyers discover suppliers, request quotes, compare offers, and stay
        on top of material price movements — all in one place.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Our mission
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Sourcing is still slow, fragmented, and opaque for many businesses.
          Finding the right supplier often means juggling spreadsheets, cold
          emails, and scattered price information. Our mission is to make
          procurement faster and more transparent by bringing supplier
          discovery, communication, and market context together in a single
          modern platform.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          What the platform does
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Suplymate is built around the everyday work of a procurement team.
          Rather than a single tool, it combines several connected capabilities:
        </p>
        <ul className="mt-6 space-y-4 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Supplier directory.</strong> A
              searchable directory of suppliers across categories and regions.
              Some listings are profiles managed by the suppliers themselves;
              others are directory entries compiled from publicly available
              information.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Requests for quote (RFQs).</strong>{" "}
              Send a structured request to one or more suppliers describing what
              you need, in what quantity, and on what timeline.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Quotes and comparison.</strong>{" "}
              Receive supplier quotes and compare them side by side so you can
              evaluate options on price, terms, and lead time.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Messaging.</strong> Communicate with
              suppliers directly on-platform to clarify specifications and
              negotiate terms.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Market price intelligence.</strong>{" "}
              Indicative material and commodity price information, drawn from
              public and third-party sources, to give context for your sourcing
              decisions.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">AI assistant.</strong> An assistant
              that helps you search, summarize, and draft as you work through
              your sourcing tasks.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How we think about trust
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We are upfront about what our information means. A supplier marked{" "}
          <strong className="text-ink">Verified</strong> has passed our manual
          review process, but verification is not a guarantee of quality,
          performance, or financial standing. Many directory listings are
          compiled from public sources and have not been independently verified.
          We encourage every buyer to do their own due diligence before entering
          into a transaction. You can read more in our{" "}
          <Link
            href="/supplier-verification-policy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Supplier Verification Policy
          </Link>
          .
        </p>
      </section>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Get in touch
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Questions, feedback, or interested in working with us? We would love
          to hear from you. Reach out through our{" "}
          <Link
            href="/contact"
            className="text-cyan transition-colors hover:text-teal"
          >
            contact page
          </Link>{" "}
          or email us at{" "}
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
