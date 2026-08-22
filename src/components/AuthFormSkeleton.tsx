/**
 * Suspense fallback for the login and signup pages.
 *
 * Both forms read search params (`callbackUrl`), so they suspend on first
 * render. The previous fallback was a bare white screen, which flashed the
 * brand away and shifted the layout once the form mounted. This mirrors
 * AuthFormLayout's geometry so the swap is invisible.
 */
export default function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#F7F8FA]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-56 animate-pulse rounded bg-slate-100" />

          <div className="mt-6 space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
            <div className="h-11 w-full animate-pulse rounded-lg bg-slate-200" />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="mx-auto h-4 w-44 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
