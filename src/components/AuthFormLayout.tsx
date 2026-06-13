import Link from "next/link";

type AuthFormLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthFormLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="mb-8 text-center font-display text-2xl font-bold text-ink">
          Suply<span className="gradient-text">mate</span>
        </Link>
        <div className="animate-fade-up glass-card p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && (
            <div className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-ink-muted">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
