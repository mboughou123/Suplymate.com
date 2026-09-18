import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  body: string;
  cta: string;
};

export default function PlanLockBanner({ title, body, cta }: Props) {
  return (
    <div
      data-testid="plan-lock-banner"
      className="mb-6 rounded-2xl border border-cyan/30 bg-cyan/5 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{body}</p>
      </div>
      <Link href="/pricing" className="btn-primary mt-3 inline-flex shrink-0 cursor-pointer sm:mt-0">
        {cta}
      </Link>
    </div>
  );
}
