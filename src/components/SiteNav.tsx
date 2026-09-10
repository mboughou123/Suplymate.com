"use client";

import HomeTopNav from "@/components/home/HomeTopNav";

/**
 * Global public chrome — same mega-menu as live production HomeTopNav,
 * always solid so inner pages are not a dark overlay.
 */
export default function SiteNav() {
  return <HomeTopNav solid />;
}
