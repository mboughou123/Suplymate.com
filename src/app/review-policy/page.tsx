import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Review Policy | Suplymate",
  description:
    "How reviews work on Suplymate: eligibility, moderation, and reporting.",
};

const states = [
  {
    label: "Pending",
    body: "The review has been submitted and is waiting to be moderated. It is not yet visible to others.",
  },
  {
    label: "Published",
    body: "The review has passed moderation and is publicly visible on the supplier profile.",
  },
  {
    label: "Rejected",
    body: "The review did not meet our guidelines — for example, it was off-topic, abusive, or could not be tied to a qualifying interaction — and will not be published.",
  },
  {
    label: "Removed",
    body: "A previously published review has been taken down, for example following a successful report or a policy violation.",
  },
];

export default function ReviewPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">Review Policy</h1>
      <p className="mt-6 leading-relaxed text-ink-muted">
        Reviews help buyers make better sourcing decisions, but only if they are
        genuine. This policy explains who can leave a review, how reviews are
        moderated, and how to report a review you believe breaks the rules.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Who can leave a review
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Reviews are only allowed after a qualifying interaction with the
          supplier on the platform — for example, an RFQ, a quote, or a
          conversation conducted through Suplymate. This requirement helps
          ensure that reviews reflect real engagement rather than hearsay.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Moderation
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Every review goes through moderation and can be in one of the
          following states:
        </p>
        <div className="mt-6 space-y-4">
          {states.map((state) => (
            <div
              key={state.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >
              <h3 className="font-display text-lg font-semibold text-ink">
                {state.label}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {state.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          What we do not allow
        </h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Incentivized reviews.</strong>{" "}
              Reviews offered in exchange for payment, discounts, or other
              rewards are not allowed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">Fake reviews.</strong> Reviews that
              are fabricated, written by the supplier about themselves, or
              written by competitors are not allowed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">
                Fake &ldquo;verified purchase&rdquo; badges.
              </strong>{" "}
              We do not display fabricated purchase or transaction badges. Any
              eligibility signal reflects a genuine on-platform interaction.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Reporting a review
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          If you believe a review violates this policy, you can report it by
          emailing{" "}
          <a
            href="mailto:info@suplymate.com"
            className="text-cyan transition-colors hover:text-teal"
          >
            info@suplymate.com
          </a>{" "}
          with a link to the review and a short explanation of the problem. Our
          team will assess the report and may set the review to rejected or
          removed if it breaks the rules. For more on how we work, see our{" "}
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
