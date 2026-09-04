"use client";

import { usePathname } from "@/i18n/navigation";
import Footer from "./Footer";

const HIDE_FOOTER = ["/ai-assistant", "/dashboard", "/supplier-dashboard", "/login", "/signup", "/forgot-password"];

export default function FooterGate() {
  const pathname = usePathname();
  if (HIDE_FOOTER.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <Footer />;
}
