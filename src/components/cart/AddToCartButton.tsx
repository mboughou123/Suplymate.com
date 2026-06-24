"use client";

import { useState } from "react";
import { Check, Plus, Loader2 } from "lucide-react";
import { useCart, type AddInput } from "./CartProvider";

type Props = {
  item: AddInput;
  className?: string;
  label?: string;
  compact?: boolean;
};

// Add-to-Cart trigger. Used on product cards, product detail, and supplier
// profiles. Works for guests (localStorage) and authed users (DB) transparently.
export default function AddToCartButton({ item, className, label = "Add to cart", compact }: Props) {
  const { add } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const onClick = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      await add(item);
      setState("done");
      setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("idle");
    }
  };

  const base =
    className ??
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan/90 disabled:opacity-60";

  return (
    <button type="button" onClick={onClick} disabled={state === "loading"} className={base}>
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : state === "done" ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Plus className="h-4 w-4" aria-hidden />
      )}
      {!compact && <span>{state === "done" ? "Added" : label}</span>}
    </button>
  );
}
