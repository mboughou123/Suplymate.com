export default function SupplierCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="shimmer h-24 bg-slate-100" />
      <div className="flex flex-col gap-4 px-5 pb-5 pt-9">
        <div className="space-y-2">
          <div className="shimmer h-4 w-2/3 rounded bg-slate-100" />
          <div className="shimmer h-3 w-1/2 rounded bg-slate-100" />
          <div className="flex gap-1.5">
            <div className="shimmer h-5 w-20 rounded bg-slate-100" />
            <div className="shimmer h-5 w-16 rounded bg-slate-100" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-16 rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-24 rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="shimmer h-10 flex-1 rounded-xl bg-slate-100" />
          <div className="shimmer h-10 flex-1 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
