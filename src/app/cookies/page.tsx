import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | Suplymate",
  description:
    "How and why Suplymate uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">Cookie Policy</h1>
      <p className="mt-3 text-sm text-ink-dim">Last updated: June 2026</p>
      <p className="mt-6 leading-relaxed text-ink-muted">
        This Cookie Policy explains how Suplymate uses cookies and similar
        technologies. Cookies are small text files stored on your device that
        help the platform work and help us understand how it is used.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Essential cookies
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          These cookies are necessary for the platform to function. They are
          used to keep you signed in, maintain your session, and protect against
          security risks. Without them, core features such as logging in would
          not work, so they cannot be turned off through the platform.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Preference cookies
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          These cookies remember choices you make, such as display preferences
          and settings, so the platform behaves the way you expect on your next
          visit.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Analytics cookies
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          These cookies help us understand how visitors use the platform in
          aggregate — for example, which pages are visited most often — so we
          can improve the experience. The information collected is used to
          understand usage patterns rather than to identify you individually.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Managing cookies
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Most browsers let you view, manage, and delete cookies through their
          settings. Blocking essential cookies may prevent parts of the platform
          from working correctly. For more on how we handle your information,
          see our{" "}
          <Link
            href="/privacy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Contact</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Questions about our use of cookies? Email us at{" "}
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
