import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Image Removal Policy | Suplymate",
  description:
    "How to request removal or correction of an image used in a Suplymate listing.",
};

export default function ImageRemovalPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Image Removal Policy
      </h1>
      <p className="mt-6 leading-relaxed text-ink-muted">
        Some directory listings on Suplymate include images that have been
        compiled from publicly available sources to help illustrate a supplier
        or its products. We respect the rights of image owners and suppliers,
        and we provide a straightforward way to request the removal or
        correction of an image.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Who can request removal
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Rights holders, their authorized representatives, and the suppliers
          featured in a listing can request that an image be removed or
          corrected. This includes situations where an image is used without
          permission, is inaccurate or outdated, or is associated with the wrong
          supplier.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How to submit a request
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Email us at{" "}
          <a
            href="mailto:info@suplymate.com"
            className="text-cyan transition-colors hover:text-teal"
          >
            info@suplymate.com
          </a>{" "}
          and include the following so we can act quickly:
        </p>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">The URL</strong> of the page where
              the image appears, and a description of which image is affected.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Proof</strong> of your rights to the
              image or of your relationship to the supplier — for example,
              evidence of ownership or authorization to act on the owner&apos;s
              behalf.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">What you would like</strong> — whether
              you are asking for removal, replacement, or correction.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How we handle takedown requests
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          When we receive a request, our team reviews it and the information
          provided. Where a request is valid, we will remove or correct the
          image. We may contact you for clarification if we need more detail to
          confirm the request. We aim to handle these requests promptly and in
          good faith.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Related policies
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          If your request is about a listing more broadly, see our{" "}
          <Link
            href="/supplier-verification-policy"
            className="text-cyan transition-colors hover:text-teal"
          >
            Supplier Verification Policy
          </Link>
          . For general help, visit the{" "}
          <Link
            href="/help"
            className="text-cyan transition-colors hover:text-teal"
          >
            Help Center
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
