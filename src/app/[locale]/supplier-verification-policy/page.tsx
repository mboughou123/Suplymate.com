import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Supplier Verification Policy | Suplymate",
  description:
    "How Suplymate reviews suppliers and what each public supplier status means.",
};

const statuses = [
  {
    label: "Unlisted",
    body: "The supplier is not publicly visible in the directory. This may be a draft entry, a removed listing, or a record kept for internal purposes only.",
  },
  {
    label: "Listed",
    body: "A public directory listing compiled from publicly available sources. The information has not been independently verified by Suplymate, and the supplier may not yet be aware of or manage the listing.",
  },
  {
    label: "Claimed",
    body: "A representative of the supplier has claimed the profile and can manage its information. Claiming a profile does not by itself mean the supplier has been verified.",
  },
  {
    label: "Pending review",
    body: "The supplier has been submitted for review and is waiting for our admin team to assess the available information.",
  },
  {
    label: "Needs information",
    body: "Our team has started a review but requires additional information or documentation from the supplier before it can continue.",
  },
  {
    label: "Reviewed",
    body: "Our team has reviewed the listing and assessed the information available, but the supplier has not met all of the criteria required for full verification.",
  },
  {
    label: "Verified",
    body: "The supplier has passed Suplymate's manual review. As part of this review we check, where possible, the business's existence, the validity of its contact details, and any documentation the supplier has provided. Verified status reflects our review at a point in time — it is not a guarantee of quality, reliability, or financial standing.",
  },
  {
    label: "Rejected",
    body: "The supplier did not pass review — for example, because information could not be confirmed or did not meet our criteria.",
  },
  {
    label: "Suspended",
    body: "A previously listed or verified supplier has been temporarily suspended, for example due to a complaint, a policy concern, or pending re-review.",
  },
];

export default function SupplierVerificationPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Supplier Verification Policy
      </h1>
      <p className="mt-6 leading-relaxed text-ink-muted">
        This policy explains how suppliers move through our review process and
        what each public status means. We aim to be transparent so that buyers
        can correctly interpret what they see on a supplier profile.
      </p>

      <section className="mt-10 rounded-2xl border border-mustard/40 bg-mustard/10 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Verified is not a guarantee
        </h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          A &ldquo;Verified&rdquo; status reflects Suplymate&apos;s manual review
          process. It is <strong className="text-ink">not</strong> a guarantee
          of a supplier&apos;s product quality, delivery, performance, or
          financial stability, and it is not a financial warranty. Buyers should
          always carry out their own due diligence before entering into any
          transaction.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          The verification lifecycle
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Verification is a manual process carried out by our admin team. A
          listing may move through several of the statuses below over time. We
          do not automatically mark suppliers as verified.
        </p>
        <div className="mt-6 space-y-4">
          {statuses.map((status) => (
            <div
              key={status.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >
              <h3 className="font-display text-lg font-semibold text-ink">
                {status.label}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {status.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          What we check during verification
        </h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Business existence</strong> — whether
              the company appears to be a genuine, operating business.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Contact validity</strong> — whether
              the contact details on the profile are reachable and consistent.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Documentation provided</strong> — any
              supporting documentation the supplier shares with us as part of the
              review.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Claiming or correcting a listing
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          If your company appears as a directory listing, a representative can
          claim the profile to manage its information and request review. To
          claim a profile or correct information, email us at{" "}
          <a
            href="mailto:info@suplymate.com"
            className="text-cyan transition-colors hover:text-teal"
          >
            info@suplymate.com
          </a>
          . For image concerns specifically, see our{" "}
          <Link
            href="/image-removal-policy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Image Removal Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
