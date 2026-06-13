import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t border-slate-200 bg-slate-50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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
              <li><Link href="/suppliers" className="transition-colors hover:text-cyan">Suppliers</Link></li>
              <li><Link href="/products" className="transition-colors hover:text-cyan">Products</Link></li>
              <li><Link href="/price-charts" className="transition-colors hover:text-cyan">Price Charts</Link></li>
              <li><Link href="/ai-assistant" className="transition-colors hover:text-cyan">AI Assistant</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Company
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/pricing" className="transition-colors hover:text-cyan">Pricing</Link></li>
              <li><span className="text-ink-dim">About (soon)</span></li>
              <li><span className="text-ink-dim">Contact (soon)</span></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Legal
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><span className="text-ink-dim">Privacy (soon)</span></li>
              <li><span className="text-ink-dim">Terms (soon)</span></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-slate-200 pt-8 text-center text-xs text-ink-dim">
          © {new Date().getFullYear()} Suplymate. MVP preview — fake data only.
        </p>
      </div>
    </footer>
  );
}
