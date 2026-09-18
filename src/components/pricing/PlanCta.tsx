"use client";

import { Link } from "@/i18n/navigation";
import MetalButton from "@/components/fx/MetalButton";
import type { PlanCta } from "@/lib/billing";

type Props = {
  plan: string;
  cta: PlanCta;
  highlighted: boolean;
  signedIn: boolean;
  labels: { free: string; trial: string; sales: string; subscribe: string };
};

/**
 * Public pricing CTA. Signed-out users go to signup (plan remembered in the
 * query); signed-in users go to Settings → Subscription where Stripe checkout
 * (with the 3-day trial on every paid plan) is initiated. No payment is ever
 * faked here.
 */
export default function PlanCta({ plan, cta, highlighted, signedIn, labels }: Props) {
  switch (cta) {
    case "sales":
      return (
        <Link href="/contact" className="btn-secondary w-full">
          {labels.sales}
        </Link>
      );
    case "free":
      return (
        <Link href={signedIn ? "/dashboard" : "/signup"} className="btn-secondary w-full">
          {labels.free}
        </Link>
      );
    case "trial":
    case "subscribe": {
      const href = signedIn ? `/settings/subscription?plan=${plan}` : `/signup?plan=${plan}`;
      const label = cta === "subscribe" ? labels.subscribe : labels.trial;
      const button = (
        <Link href={href} className={`${highlighted ? "btn-primary" : "btn-accent"} w-full`}>
          {label}
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
    default: {
      const _never: never = cta;
      return _never;
    }
  }
}
