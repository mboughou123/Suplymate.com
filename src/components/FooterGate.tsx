"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

const HIDE_FOOTER = ["/ai-assistant"];

export default function FooterGate() {
  const pathname = usePathname();
  if (HIDE_FOOTER.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <Footer />;
}
