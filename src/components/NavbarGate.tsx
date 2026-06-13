"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

const HIDE_NAVBAR = ["/ai-assistant", "/dashboard"];

export default function NavbarGate() {
  const pathname = usePathname();
  if (HIDE_NAVBAR.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <Navbar />;
}
