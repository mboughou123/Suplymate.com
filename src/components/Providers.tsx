"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import { ThemeProvider } from "@/lib/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
