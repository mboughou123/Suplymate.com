"use client";

import { usePathname } from "@/i18n/navigation";
import SiteNav from "./SiteNav";

/** Routes that use their own chrome (auth forms, app shells). */
const HIDE_SITE_NAV = [
  "/login",
  "/signup",
  "/forgot-password",
  "/dashboard",
  "/admin",
  "/supplier-dashboard",
  "/messages",
  "/settings",
  "/onboarding",
  "/notifications",
  "/cart",
  "/rfqs",
  "/purchase-orders",
  "/saved",
];

export default function NavbarGate() {
  const pathname = usePathname();
  if (HIDE_SITE_NAV.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <SiteNav />;
}
