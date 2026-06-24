import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Suplymate",
  description:
    "How Suplymate collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-ink-dim">Last updated: June 2026</p>
      <p className="mt-6 leading-relaxed text-ink-muted">
        This Privacy Policy explains what information Suplymate collects, how we
        use it, and the choices you have. By using the platform, you agree to
        the practices described here.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Information we collect
        </h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Account information.</strong>{" "}
              Details you provide when you register and manage your profile, such
              as your name, email address, company, and account preferences.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">
                RFQ, quote, and message content.
              </strong>{" "}
              The content of the requests for quote, quotes, and messages you
              create or exchange on the platform.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Usage information.</strong>{" "}
              Information about how you interact with the platform, such as pages
              viewed, searches performed, and general device and log data.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How we use information
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We use the information we collect to provide and improve the platform,
          including to: operate your account; deliver RFQs, quotes, and messages
          between buyers and suppliers; power the AI assistant and search;
          maintain security and prevent abuse; respond to your inquiries; and
          understand how the platform is used so we can make it better.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Third parties
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We rely on a small number of service providers to operate the
          platform. These may include:
        </p>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Hosting and infrastructure</strong>{" "}
              providers that store data and run the application.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">AI processing.</strong> When you use
              the AI assistant, relevant content may be processed by a
              third-party AI provider (such as OpenAI) to generate responses.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Analytics</strong> providers that
              help us understand aggregate usage of the platform.
            </span>
          </li>
        </ul>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We share information with these providers only as needed to deliver
          the service. We do not sell your personal information.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Cookies</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We use cookies and similar technologies to keep you signed in,
          remember your preferences, and understand usage. For details, see our{" "}
          <Link
            href="/cookies"
            className="text-cyan transition-colors hover:text-teal"
          >
            Cookie Policy
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Your rights
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Depending on where you live, you may have rights to access, correct,
          export, or delete your personal information, and to object to or
          restrict certain processing. You can manage much of your information
          directly in your account settings. To make a request that you
          cannot complete yourself, contact us using the details below.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Data retention &amp; security
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We retain information for as long as it is needed to provide the
          platform and to meet our legal and operational requirements. We take
          reasonable measures to protect information, though no method of
          transmission or storage is completely secure.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Changes to this policy
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We may update this Privacy Policy from time to time. When we do, we
          will revise the &ldquo;Last updated&rdquo; date above.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Contact</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          If you have questions about this policy or your information, email us
          at{" "}
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
