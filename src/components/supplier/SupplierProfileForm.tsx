"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, AlertCircle, Loader2, Building2 } from "lucide-react";
import { INDUSTRIES, type IndustryId } from "@/data/industries";
import type { OwnedSupplierProfile } from "@/lib/supplier-owner";
import TagInput from "@/components/ui/TagInput";

type FormState = {
  name: string;
  description: string;
  logoUrl: string;
  imageUrl: string;
  images: string[];
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  industriesServed: IndustryId[];
  materials: string[];
  products: string[];
  deliveryRegions: string[];
  moq: string;
  pricingNotes: string;
  leadTime: string;
  yearsInBusiness: string;
  employees: string;
  certifications: string[];
};

function fromProfile(p: OwnedSupplierProfile | null, fallbackName: string): FormState {
  return {
    name: p?.name ?? fallbackName,
    description: p?.description ?? "",
    logoUrl: p?.logoUrl ?? "",
    imageUrl: p?.imageUrl ?? "",
    images: p?.images ?? [],
    website: p?.website ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    country: p?.country ?? "",
    industriesServed: p?.industriesServed ?? [],
    materials: p?.materials ?? [],
    products: p?.products ?? [],
    deliveryRegions: p?.deliveryRegions ?? [],
    moq: p?.moq ?? "",
    pricingNotes: p?.pricingNotes ?? "",
    leadTime: p?.leadTime ?? "",
    yearsInBusiness: p?.yearsInBusiness ? String(p.yearsInBusiness) : "",
    employees: p?.employees ?? "",
    certifications: p?.certifications.map((c) => c.name) ?? [],
  };
}

const input =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-ink focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function SupplierProfileForm({
  initial,
  fallbackName,
}: {
  initial: OwnedSupplierProfile | null;
  fallbackName: string;
}) {
  const t = useTranslations("supplierDashboard");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromProfile(initial, fallbackName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function toggleIndustry(id: IndustryId) {
    set(
      "industriesServed",
      form.industriesServed.includes(id)
        ? form.industriesServed.filter((x) => x !== id)
        : [...form.industriesServed, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("fieldName") + " — " + tErrors("generic"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          location: [form.city, form.country].filter(Boolean).join(", "),
          yearsInBusiness: form.yearsInBusiness ? Number(form.yearsInBusiness) : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || tErrors("generic"));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(tErrors("network"));
    } finally {
      setSaving(false);
    }
  }

  const materialSuggestions = INDUSTRIES.filter((i) => form.industriesServed.includes(i.id)).flatMap(
    (i) => i.subcategories,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title={t("sectionIdentity")} hint={t("sectionIdentityHint")}>
        <div className="sm:col-span-2 flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-ink-dim">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6" aria-hidden />
            )}
          </span>
          <div className="flex-1">
            <label htmlFor="logoUrl" className="text-xs font-medium text-ink-muted">
              {t("fieldLogo")}
            </label>
            <input id="logoUrl" type="url" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="name" className="text-xs font-medium text-ink-muted">
            {t("fieldName")} <span className="text-red-500">*</span>
          </label>
          <input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="imageUrl" className="text-xs font-medium text-ink-muted">
            {t("fieldCover")}
          </label>
          <input id="imageUrl" type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" className={input} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className="text-xs font-medium text-ink-muted">
            {t("fieldDescription")}
          </label>
          <textarea id="description" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={input} />
        </div>
      </Section>

      <Section title={t("sectionLocation")}>
        <div>
          <label htmlFor="website" className="text-xs font-medium text-ink-muted">{t("fieldWebsite")}</label>
          <input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="company.com" className={input} />
        </div>
        <div>
          <label htmlFor="email" className="text-xs font-medium text-ink-muted">{t("fieldEmail")}</label>
          <input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="text-xs font-medium text-ink-muted">{t("fieldPhone")}</label>
          <input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="address" className="text-xs font-medium text-ink-muted">{t("fieldAddress")}</label>
          <input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="city" className="text-xs font-medium text-ink-muted">{t("fieldCity")}</label>
          <input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="country" className="text-xs font-medium text-ink-muted">{t("fieldCountry")}</label>
          <input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} className={input} />
        </div>
      </Section>

      <Section title={t("sectionOffer")} hint={t("sectionOfferHint")}>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-ink-muted">{t("fieldIndustries")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => {
              const on = form.industriesServed.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => toggleIndustry(ind.id)}
                  aria-pressed={on}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    on ? "border-cyan bg-cyan text-white" : "border-slate-200 bg-white text-ink-muted hover:border-slate-300"
                  }`}
                >
                  {ind.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="materials" className="text-xs font-medium text-ink-muted">{t("fieldMaterials")}</label>
          <TagInput id="materials" value={form.materials} onChange={(v) => set("materials", v)} placeholder={t("addTagPlaceholder")} suggestions={materialSuggestions} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="products" className="text-xs font-medium text-ink-muted">{t("fieldProducts")}</label>
          <TagInput id="products" value={form.products} onChange={(v) => set("products", v)} placeholder={t("addTagPlaceholder")} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="regions" className="text-xs font-medium text-ink-muted">{t("fieldRegions")}</label>
          <TagInput id="regions" value={form.deliveryRegions} onChange={(v) => set("deliveryRegions", v)} placeholder={t("addTagPlaceholder")} suggestions={["Europe", "North America", "Middle East", "Asia", "Africa", "Worldwide"]} />
        </div>
      </Section>

      <Section title={t("sectionCommercial")} hint={t("sectionCommercialHint")}>
        <div>
          <label htmlFor="moq" className="text-xs font-medium text-ink-muted">{t("fieldMoq")}</label>
          <input id="moq" value={form.moq} onChange={(e) => set("moq", e.target.value)} placeholder="e.g. 20 tons" className={input} />
        </div>
        <div>
          <label htmlFor="leadTime" className="text-xs font-medium text-ink-muted">{t("fieldLeadTime")}</label>
          <input id="leadTime" value={form.leadTime} onChange={(e) => set("leadTime", e.target.value)} placeholder={t("fieldLeadTimeHint")} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pricingNotes" className="text-xs font-medium text-ink-muted">{t("fieldPricing")}</label>
          <input id="pricingNotes" value={form.pricingNotes} onChange={(e) => set("pricingNotes", e.target.value)} placeholder={t("fieldPricingHint")} className={input} />
        </div>
        <div>
          <label htmlFor="years" className="text-xs font-medium text-ink-muted">{t("fieldYears")}</label>
          <input id="years" type="number" min={0} max={300} value={form.yearsInBusiness} onChange={(e) => set("yearsInBusiness", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="employees" className="text-xs font-medium text-ink-muted">{t("fieldEmployees")}</label>
          <input id="employees" value={form.employees} onChange={(e) => set("employees", e.target.value)} placeholder="e.g. 50–200" className={input} />
        </div>
      </Section>

      <Section title={t("sectionCerts")} hint={t("sectionCertsHint")}>
        <div className="sm:col-span-2">
          <label htmlFor="certs" className="text-xs font-medium text-ink-muted">{t("fieldCerts")}</label>
          <TagInput id="certs" value={form.certifications} onChange={(v) => set("certifications", v)} placeholder={t("addTagPlaceholder")} suggestions={["ISO 9001", "ISO 14001", "ISO 45001", "CE", "API", "ISO 13485", "UL", "RoHS"]} max={20} />
        </div>
      </Section>

      <Section title={t("sectionPhotos")}>
        <div className="sm:col-span-2">
          <label htmlFor="photos" className="text-xs font-medium text-ink-muted">{t("fieldPhotos")}</label>
          <TagInput id="photos" value={form.images} onChange={(v) => set("images", v)} placeholder="https://…" max={12} />
          {form.images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {form.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-square w-full rounded-lg border border-slate-200 object-cover" />
              ))}
            </div>
          )}
        </div>
      </Section>

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {t("profileSaved")}
        </p>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary shadow-cardHover disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("saveProfile")}
        </button>
      </div>
    </form>
  );
}
