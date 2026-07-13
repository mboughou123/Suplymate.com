import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavbarGate from "@/components/NavbarGate";
import FooterGate from "@/components/FooterGate";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Suplymate — AI Procurement Platform",
  description:
    "Find suppliers, compare prices, track material markets, and buy at the right time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={inter.variable}
    >
      <body className="min-h-screen flex flex-col font-sans">
        <Providers>
          <NavbarGate />
          <main className="flex-1">{children}</main>
          <FooterGate />
        </Providers>
      </body>
    </html>
  );
}
