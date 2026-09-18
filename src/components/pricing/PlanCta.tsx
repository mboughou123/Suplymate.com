"use client";

import { Link } from "@/i18n/navigation";
import MetalButton from "@/components/fx/MetalButton";

type Props = {
  plan: string;
  cta: "free" | "trial" | "upgrade" | "sales";
  highlighted: boolean;
  signedIn: boolean;
  labels: { free: string; trial: string; upgrade: string; sales: string };
};

/**
 * Public pricing CTA. Signed-out users go to signup (plan remembered in the
 * query); signed-in users go to Settings → Subscription. Checkout itself is
 * owned by billing — this button only deep-links.
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
    case "upgrade": {
      const href = signedIn ? `/settings/subscription?plan=${plan}` : `/signup?plan=${plan}`;
      const label = cta === "trial" ? labels.trial : labels.upgrade;
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
      const _exhaustive: never = cta;
      return _exhaustive;
    }
  }
}
