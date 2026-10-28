"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { captureFirstTouch } from "@/lib/attribution";
import {
  EARLY_ACCESS_CATEGORIES,
  EARLY_ACCESS_ROLES,
  earlyAccessCategoryKey,
  validateEarlyAccess,
  type EarlyAccessErrors,
  type EarlyAccessRole,
} from "@/lib/early-access";

type Variant = "page" | "compact";
type Status = "idle" | "submitting" | "created" | "duplicate";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition placeholder:text-ink-dim/70 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20";

export default function EarlyAccessForm({ locale, variant }: { locale: string; variant: Variant }) {
  const t = useTranslations("earlyAccess");
  const categoryLabel = useTranslations("homeProducts.categories");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<EarlyAccessErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [role, setRole] = useState<EarlyAccessRole | "">("");
  const [categories, setCategories] = useState<string[]>([]);

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      name: String(form.get("name") ?? ""),
      company: String(form.get("company") ?? ""),
      role,
      categories,
      note: String(form.get("note") ?? ""),
      fax: String(form.get("fax") ?? ""),
      locale,
    };
    const validation = validateEarlyAccess(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      setFormError(null);
      return;
    }
    setErrors({});
    setFormError(null);
    setStatus("submitting");

    const attribution = captureFirstTouch(window.sessionStorage, window.location, document.referrer);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          utmContent: attribution.utmContent,
          referrer: attribution.referrer,
          landingPath: attribution.landingPath,
        }),
      });
      const body = (await res.json().catch(() => null)) as { status?: string; error?: string } | null;
      if (res.status === 429) {
        setStatus("idle");
        setFormError(t("rateLimited"));
        return;
      }
      if (!res.ok || !body?.status) {
        setStatus("idle");
        setFormError(t("errorGeneric"));
        return;
      }
      if (body.status === "duplicate") {
        setStatus("duplicate");
        return;
      }
      setStatus("created");
      try {
        const { track } = await import("@vercel/analytics");
        track("early_access_signup", { utm_source: attribution.utmSource || "direct" });
      } catch {
        // A saved signup still stands if the analytics script cannot load.
      }
    } catch {
      setStatus("idle");
      setFormError(t("errorGeneric"));
    }
  }

  if (status === "created" || status === "duplicate") {
    const duplicate = status === "duplicate";
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status" aria-live="polite">
        <p className="font-display text-lg font-semibold text-ink">
          {duplicate ? t("duplicateTitle") : t("successTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {duplicate ? t("duplicateBody") : t("successBody")}
        </p>
      </div>
    );
  }

  const errorText = (field: keyof EarlyAccessErrors) => {
    const code = errors[field];
    return code ? t(`errors.${code}`) : null;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="relative">
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`ea-fax-${variant}`}>Fax</label>
        <input id={`ea-fax-${variant}`} name="fax" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className={variant === "page" ? "grid gap-4 sm:grid-cols-2" : "grid gap-3"}>
        <Field label={t("email")} error={errorText("email")} className={variant === "page" ? "sm:col-span-2" : undefined}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={errors.email ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field label={t("name")} error={errorText("name")} optional={t("optional")}>
          <input name="name" type="text" autoComplete="name" maxLength={80} className={inputClass} />
        </Field>
        <Field label={t("company")} error={errorText("company")} optional={t("optional")}>
          <input name="company" type="text" autoComplete="organization" maxLength={120} className={inputClass} />
        </Field>
        <Field
          label={t("role")}
          error={errorText("role")}
          optional={t("optional")}
          className={variant === "page" ? "sm:col-span-2" : undefined}
        >
          <select
            name="role"
            value={role}
            onChange={(event) => {
              const next = event.target.value;
              setRole(isRole(next) ? next : "");
            }}
            className={inputClass}
          >
            <option value="">{t("rolePlaceholder")}</option>
            {EARLY_ACCESS_ROLES.map((key) => (
              <option key={key} value={key}>
                {t(`roles.${key}`)}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className={variant === "page" ? "sm:col-span-2" : undefined}>
          <legend className="text-sm font-medium text-ink">
            {t("categories")} <span className="font-normal text-ink-dim">({t("optional")})</span>
          </legend>
          <p className="mt-1 text-xs text-ink-dim">{t("categoriesHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EARLY_ACCESS_CATEGORIES.map((category) => {
              const selected = categories.includes(category);
              return (
                <label
                  key={category}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    selected ? "border-cyan bg-cyan/10 text-ink" : "border-slate-200 bg-white text-ink-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-cyan"
                    checked={selected}
                    onChange={() => toggleCategory(category)}
                  />
                  {categoryLabel(earlyAccessCategoryKey(category))}
                </label>
              );
            })}
          </div>
          {errorText("categories") && (
            <p className="mt-1 text-xs text-red-700" role="alert">
              {errorText("categories")}
            </p>
          )}
        </fieldset>
        <Field
          label={t("note")}
          error={errorText("note")}
          optional={t("optional")}
          className={variant === "page" ? "sm:col-span-2" : undefined}
        >
          <textarea
            name="note"
            rows={variant === "compact" ? 2 : 4}
            maxLength={2000}
            placeholder={t("notePlaceholder")}
            className={inputClass}
          />
        </Field>
      </div>

      {formError && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary mt-5 w-full px-6 py-3 disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-ink-dim">
        {t("privacy")}{" "}
        <Link href="/privacy" className="text-cyan hover:underline">
          {t("privacyLink")}
        </Link>
      </p>
    </form>
  );
}

function isRole(value: string): value is EarlyAccessRole {
  return (EARLY_ACCESS_ROLES as readonly string[]).includes(value);
}

function Field({
  label,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  error: string | null;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-dim"> ({optional})</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
