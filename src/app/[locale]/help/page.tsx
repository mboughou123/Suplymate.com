import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help Center | Suplymate",
  description:
    "Learn how to use Suplymate: finding suppliers, sending RFQs, comparing quotes, messaging, and managing your account.",
};

const sections = [
  {
    title: "Getting started",
    body: "Create an account to start exploring the platform. From your dashboard you can search the supplier directory, browse products, view market price charts, and use the AI assistant. Take a moment to complete your profile so suppliers know who they are working with when you reach out.",
  },
  {
    title: "Finding suppliers",
    body: "Use the supplier directory to search by category, region, and keyword. Each listing shows the information we have available, along with a public status that tells you how much of it has been reviewed. Some suppliers manage their own profiles; others are directory entries compiled from public sources and are not independently verified.",
  },
  {
    title: "Sending RFQs",
    body: "When you find a supplier you want to engage, send a Request for Quote (RFQ). Describe what you need, the quantity, your timeline, and any specifications. You can send an RFQ to a single supplier or to several at once to gather competing offers.",
  },
  {
    title: "Comparing quotes",
    body: "Suppliers respond to your RFQ with quotes. Compare them side by side on price, lead time, and terms so you can make an informed decision. Quotes and the terms within them are offered directly by the supplier.",
  },
  {
    title: "Messaging",
    body: "Use on-platform messaging to clarify specifications, ask follow-up questions, and negotiate terms with suppliers. Keeping the conversation on-platform makes it easy to keep track of what was agreed.",
  },
  {
    title: "Account & billing",
    body: "Manage your profile, preferences, and security from your account settings. If billing is active for your plan, subscription details are available in your settings. For billing questions, email us at info@suplymate.com.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">Help Center</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Everything you need to get the most out of Suplymate. Browse the topics
        below, check our{" "}
        <Link
          href="/faq"
          className="text-cyan transition-colors hover:text-teal"
        >
          FAQ
        </Link>
        , or{" "}
        <Link
          href="/contact"
          className="text-cyan transition-colors hover:text-teal"
        >
          contact us
        </Link>{" "}
        if you still have questions.
      </p>

      <div className="mt-12 space-y-8">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
          >
            <h2 className="font-display text-xl font-semibold text-ink">
              {section.title}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Policies &amp; trust
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          We believe in being transparent about how the platform works. These
          policies explain our approach in detail:
        </p>
        <ul className="mt-6 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/supplier-verification-policy"
              className="text-cyan transition-colors hover:text-teal"
            >
              Supplier Verification Policy
            </Link>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/review-policy"
              className="text-cyan transition-colors hover:text-teal"
            >
              Review Policy
            </Link>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/image-removal-policy"
              className="text-cyan transition-colors hover:text-teal"
            >
              Image Removal Policy
            </Link>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/refund-and-protection-policy"
              className="text-cyan transition-colors hover:text-teal"
            >
              Refund &amp; Protection Policy
            </Link>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/privacy"
              className="text-cyan transition-colors hover:text-teal"
            >
              Privacy Policy
            </Link>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/terms"
              className="text-cyan transition-colors hover:text-teal"
            >
              Terms of Service
            </Link>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <Link
              href="/cookies"
              className="text-cyan transition-colors hover:text-teal"
            >
              Cookie Policy
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
