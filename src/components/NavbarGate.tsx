"use client";

import { usePathname } from "@/i18n/navigation";
import Navbar from "./Navbar";

const HIDE_NAVBAR = ["/", "/ai-assistant", "/dashboard", "/supplier-dashboard", "/login", "/signup"];

export default function NavbarGate() {
  const pathname = usePathname();
  if (HIDE_NAVBAR.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <Navbar />;
}
