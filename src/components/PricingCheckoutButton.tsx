"use client";

import { useState } from "react";

type PricingCheckoutButtonProps = {
  label: string;
  busyLabel: string;
  errorLabel: string;
  className: string;
};

export default function PricingCheckoutButton({
  label,
  busyLabel,
  errorLabel,
  className,
}: PricingCheckoutButtonProps) {
  const [busy, setBusy] = useState(false);

  async function startCheckout() {
    setBusy(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      window.alert(data.error || errorLabel);
    } catch {
      window.alert(errorLabel);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={busy}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {busy ? busyLabel : label}
    </button>
  );
}
