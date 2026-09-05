type Tone = "neutral" | "info" | "accent" | "success" | "muted" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  accent: "border-cyan/20 bg-cyan-soft text-cyan",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  muted: "border-slate-200 bg-slate-50 text-slate-500",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
};

export default function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export type { Tone as StatusTone };
