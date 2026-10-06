import { AI_GENERATED_LABEL } from "@/lib/image-attribution";

/** Visible label required on every AI product illustration. */
export default function AiIllustrationBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      {AI_GENERATED_LABEL}
    </span>
  );
}
