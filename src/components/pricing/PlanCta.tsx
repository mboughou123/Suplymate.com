"use client";

import { Link } from "@/i18n/navigation";
import type { BillingInterval, PlanCta } from "@/lib/billing";

type Props = {
  plan: string;
  cta: PlanCta;
  signedIn: boolean;
  interval?: BillingInterval;
  labels: { free: string; trial: string; sales: string; subscribe: string };
};

const BUTTON_CLASS = "btn-primary w-full";

/**
 * Public pricing CTA. Signed-out users go to signup (plan remembered in the
 * query); signed-in users go to Settings → Subscription where Stripe checkout
 * (with the 3-day trial on Basic/Pro) is initiated. No payment is ever faked here.
 */
export default function PlanCta({ plan, cta, signedIn, interval = "month", labels }: Props) {
  switch (cta) {
    case "sales":
      return (
        <Link href="/contact" className={BUTTON_CLASS}>
          {labels.sales}
        </Link>
      );
    case "free":
      return (
        <Link href={signedIn ? "/dashboard" : "/signup"} className={BUTTON_CLASS}>
          {labels.free}
        </Link>
      );
    case "trial":
    case "subscribe": {
      const query = `plan=${plan}${interval === "year" ? "&interval=year" : ""}`;
      const href = signedIn ? `/settings/subscription?${query}` : `/signup?${query}`;
      return (
        <Link href={href} className={BUTTON_CLASS}>
          {cta === "subscribe" ? labels.subscribe : labels.trial}
        </Link>
      );
    }
    default: {
      const _never: never = cta;
      return _never;
    }
  }
}
