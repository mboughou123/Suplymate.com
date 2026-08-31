const WORDMARKS = [
  "AL GHARBIA PIPE",
  "ISPAT ALLOYS",
  "AJ STEEL",
  "CASASTEEL",
  "ATLAS METALS",
  "BUILDPRO",
  "VOLTLINE",
  "PACKSMART",
];

export default function HomeTrustStrip() {
  return (
    <section aria-hidden className="border-y border-slate-100/80 bg-white/50 py-5">
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-10 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center sm:gap-14">
          {[...WORDMARKS, ...WORDMARKS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 whitespace-nowrap font-display text-xs font-semibold uppercase tracking-[0.22em] text-ink-dim/80 sm:text-sm"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
