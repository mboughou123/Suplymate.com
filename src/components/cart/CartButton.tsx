"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

export default function CartButton() {
  const t = useTranslations("navigation");
  const { cart, openDrawer } = useCart();
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={t("openCart")}
      className="relative inline-flex rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
    >
      <ShoppingCart className="h-5 w-5" aria-hidden />
      {cart.itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-glow px-1 text-[10px] font-bold text-navy-dark">
          {cart.itemCount > 9 ? "9+" : cart.itemCount}
        </span>
      )}
    </button>
  );
}
