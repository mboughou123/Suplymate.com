// Mirrors the products catalogue: navy hero, filter row, then a product card
// grid. Card height matches the real card so the grid does not reflow.
//
// This lives in a (catalogue) route group rather than directly under
// products/. A loading.tsx applies to its whole subtree, so at products/ it
// also wrapped products/[id] — flushing that route's shell with HTTP 200 before
// the product lookup ran, which turned notFound() into a soft 404 that crawlers
// would index. The group keeps the skeleton on /products without covering the
// detail route. Do not move this file back up a level.
export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-transparent" aria-busy="true">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-white/15" />
          <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-11 w-40 animate-pulse rounded-xl border border-line bg-surface"
            />
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-line bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
