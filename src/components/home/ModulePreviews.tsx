/**
 * Abstract UI mocks for the Scout / Compare / Watch module cards.
 * Purely decorative (aria-hidden) — no real data, no client JS.
 */

export function ScoutPreview() {
  return (
    <div aria-hidden className="space-y-2 p-4">
      {["Al Gharbia Pipe Co.", "Ispat Alloys & Tube", "AJ STEEL - ICAD2"].map((name, i) => (
        <div
          key={name}
          className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan" />
            <span className="text-[10px] font-medium text-ink">{name}</span>
          </div>
          {i === 0 && (
            <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[9px] font-semibold text-cyan">
              Verified
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ComparePreview() {
  return (
    <div aria-hidden className="grid grid-cols-3 gap-1.5 p-4">
      {[
        { p: "$14.20", l: "12d" },
        { p: "$13.40", l: "14d" },
        { p: "$15.10", l: "10d" },
      ].map((col) => (
        <div
          key={col.p}
          className="rounded-lg border border-slate-200/80 bg-white p-2 text-center shadow-sm"
        >
          <p className="text-[10px] font-bold tabular-nums text-cyan">{col.p}</p>
          <p className="mt-1 text-[9px] text-ink-dim">MOQ 270m</p>
          <p className="text-[9px] font-medium text-ink-muted">{col.l} lead</p>
        </div>
      ))}
    </div>
  );
}

export function WatchPreview() {
  return (
    <div aria-hidden className="space-y-2 p-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
        <span className="text-[10px] font-medium text-ink">HDPE Index</span>
        <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[9px] font-semibold text-cyan">
          −2.1%
        </span>
      </div>
      <div className="flex gap-2">
        <span className="rounded-full border border-cyan/25 bg-cyan/5 px-2 py-1 text-[9px] font-semibold text-cyan">
          Wait window
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-ink-dim">
          Monitor
        </span>
      </div>
    </div>
  );
}
