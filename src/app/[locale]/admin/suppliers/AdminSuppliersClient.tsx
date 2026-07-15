"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Search, Images, Award, BadgeCheck } from "lucide-react";
import MediaManagerModal from "@/components/admin/media/MediaManagerModal";

type SupplierRow = {
  id: string;
  name: string;
  country: string | null;
  category: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  verificationStatus: string;
};

export default function AdminSuppliersClient({ suppliers }: { suppliers: SupplierRow[] }) {
  const [search, setSearch] = useState("");
  const [mediaFor, setMediaFor] = useState<SupplierRow | null>(null);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.country ?? "").toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="border-b border-slate-200 bg-gradient-to-br from-navy-dark to-navy py-10 text-white">
        <div className="container-page">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Supplier media</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Manage each supplier&apos;s logo, cover, factory/office/warehouse/team photos and gallery, plus
            their certifications. Published media appears on the public supplier profile &amp; cards.
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input
              type="search"
              placeholder="Search suppliers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <Link href="/admin/media" className="ml-auto text-sm font-semibold text-cyan hover:underline">
            Open full media library →
          </Link>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-ink-muted">
            No suppliers found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs text-ink-dim">
                <tr>
                  <th className="px-4 py-2">Supplier</th>
                  <th className="px-4 py-2">Country</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {s.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logoUrl} alt="" className="h-8 w-8 rounded-md border border-slate-200 object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-ink">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{s.country ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{s.category ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          s.verificationStatus === "verified"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.verificationStatus === "verified" && <BadgeCheck className="h-3 w-3" />}
                        {s.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setMediaFor(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan"
                        >
                          <Images className="h-3.5 w-3.5" /> Manage images
                        </button>
                        <Link
                          href={`/admin/certifications?supplierId=${encodeURIComponent(s.id)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan"
                        >
                          <Award className="h-3.5 w-3.5" /> Certifications
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mediaFor && (
        <MediaManagerModal
          entityType="SUPPLIER"
          entityId={mediaFor.id}
          allowedTypes={["SUPPLIER_LOGO", "SUPPLIER_COVER", "SUPPLIER_FACTORY", "SUPPLIER_GALLERY"]}
          defaultType="SUPPLIER_GALLERY"
          title={`Manage media · ${mediaFor.name}`}
          description="Logo (square), cover (wide), factory/office/warehouse/team and gallery photos. Set a primary logo & cover, reorder the gallery, edit alt text/captions/source URLs and publish. Published media shows on the public profile."
          onClose={() => setMediaFor(null)}
        />
      )}
    </div>
  );
}
