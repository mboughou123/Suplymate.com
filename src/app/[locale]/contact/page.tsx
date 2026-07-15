import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Suplymate",
  description:
    "Get in touch with the Suplymate team. Email us at info@suplymate.com.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">Contact us</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Whether you have a question about the platform, need help with your
        account, or want to tell us about a supplier listing, we are happy to
        hear from you.
      </p>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
          Email
        </p>
        <a
          href="mailto:info@suplymate.com"
          className="mt-3 inline-block font-display text-2xl font-semibold text-cyan transition-colors hover:text-teal"
        >
          info@suplymate.com
        </a>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We aim to respond to inquiries by email. The best way to reach us is
          to send a detailed message describing what you need, and we will get
          back to you as soon as we can.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          What to include
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          To help us respond quickly and accurately, please include the
          following where relevant:
        </p>
        <ul className="mt-6 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              The email address associated with your account, if you have one.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              A clear description of your question or the issue you are seeing.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              For supplier listing or image concerns, the URL of the relevant
              page.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Common requests
        </h2>
        <ul className="mt-6 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              Claiming a company profile — see our{" "}
              <Link
                href="/supplier-verification-policy"
                className="text-cyan transition-colors hover:text-teal"
              >
                Supplier Verification Policy
              </Link>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              Requesting removal or correction of an image — see our{" "}
              <Link
                href="/image-removal-policy"
                className="text-cyan transition-colors hover:text-teal"
              >
                Image Removal Policy
              </Link>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              General questions — browse our{" "}
              <Link
                href="/help"
                className="text-cyan transition-colors hover:text-teal"
              >
                Help Center
              </Link>{" "}
              and{" "}
              <Link
                href="/faq"
                className="text-cyan transition-colors hover:text-teal"
              >
                FAQ
              </Link>
              .
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
