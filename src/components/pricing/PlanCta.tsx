"use client";

import { Link } from "@/i18n/navigation";
import MetalButton from "@/components/fx/MetalButton";

type Props = {
  plan: string;
  cta: "free" | "trial" | "sales";
  highlighted: boolean;
  signedIn: boolean;
  labels: { free: string; trial: string; sales: string };
};

/**
 * Public pricing CTA. Signed-out users go to signup (plan remembered in the
 * query); signed-in users go to Settings → Subscription where Stripe checkout
 * (with the 3-day trial) is initiated. No payment is ever faked here.
 */
export default function PlanCta({ plan, cta, highlighted, signedIn, labels }: Props) {
  if (cta === "sales") {
    return (
      <Link href="/contact" className="btn-secondary w-full">
        {labels.sales}
      </Link>
    );
  }
  if (cta === "free") {
    return (
      <Link href={signedIn ? "/dashboard" : "/signup"} className="btn-secondary w-full">
        {labels.free}
      </Link>
    );
  }
  const href = signedIn ? `/settings/subscription?plan=${plan}` : `/signup?plan=${plan}`;
  const button = (
    <Link href={href} className={`${highlighted ? "btn-primary" : "btn-accent"} w-full`}>
      {labels.trial}
    </Link>
  );
  return highlighted ? (
    <MetalButton preset="chromatic" strength={0.9} theme="light">
      {button}
    </MetalButton>
  ) : (
    button
  );
}
