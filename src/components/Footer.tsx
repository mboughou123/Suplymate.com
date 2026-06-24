import Link from "next/link";

const linkClass = "transition-colors hover:text-cyan";

export default function Footer() {
  return (
    <footer className="relative border-t border-slate-200 bg-slate-50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="font-display text-lg font-bold text-ink">
              Suply<span className="gradient-text">mate</span>
            </p>
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">
              Your AI procurement friend. Smarter sourcing for modern businesses.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Platform
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/suppliers" className={linkClass}>Suppliers</Link></li>
              <li><Link href="/products" className={linkClass}>Products</Link></li>
              <li><Link href="/price-charts" className={linkClass}>Price Charts</Link></li>
              <li><Link href="/ai-assistant" className={linkClass}>AI Assistant</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Company
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/pricing" className={linkClass}>Pricing</Link></li>
              <li><Link href="/about" className={linkClass}>About</Link></li>
              <li><Link href="/contact" className={linkClass}>Contact</Link></li>
              <li><Link href="/help" className={linkClass}>Help</Link></li>
              <li><Link href="/faq" className={linkClass}>FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Legal
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/privacy" className={linkClass}>Privacy</Link></li>
              <li><Link href="/terms" className={linkClass}>Terms</Link></li>
              <li><Link href="/cookies" className={linkClass}>Cookies</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Trust &amp; Policies
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/supplier-verification-policy" className={linkClass}>Supplier Verification Policy</Link></li>
              <li><Link href="/review-policy" className={linkClass}>Review Policy</Link></li>
              <li><Link href="/image-removal-policy" className={linkClass}>Image Removal</Link></li>
              <li><Link href="/refund-and-protection-policy" className={linkClass}>Refund &amp; Protection</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-slate-200 pt-8 text-center text-xs text-ink-dim">
          © {new Date().getFullYear()} Suplymate. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
