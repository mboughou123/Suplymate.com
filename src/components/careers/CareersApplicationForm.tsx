"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import {
  APPLICATION_LIMITS,
  CAREER_ROLE_KEYS,
  validateApplication,
  type ApplicationFieldError,
  type CareerRoleKey,
} from "@/lib/careers";

type Status = "idle" | "submitting" | "sent" | "error";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition placeholder:text-ink-dim/70 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20";
const errorInputClass = "border-red-300 focus:border-red-400 focus:ring-red-100";

export default function CareersApplicationForm({
  defaultRole,
  fallbackEmail,
}: {
  defaultRole?: CareerRoleKey;
  fallbackEmail: string;
}) {
  const t = useTranslations("careers");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<ApplicationFieldError>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [role, setRole] = useState<CareerRoleKey>(defaultRole ?? "general");

  const fieldError = (key: keyof ApplicationFieldError) =>
    errors[key] ? t(`errors.${errors[key]}`) : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    const check = validateApplication(payload);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }

    setErrors({});
    setServerError(null);
    setStatus("submitting");

    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: ApplicationFieldError;
      };

      if (res.ok) {
        setStatus("sent");
        form.reset();
        return;
      }

      if (data.fields) setErrors(data.fields);
      setServerError(
        data.error === "rate_limited"
          ? t("errors.rateLimited")
          : data.error === "mail_not_configured" || data.error === "send_failed"
            ? t("errors.deliveryFailed", { email: fallbackEmail })
            : t("errors.generic"),
      );
      setStatus("error");
    } catch {
      setServerError(t("errors.generic"));
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald" aria-hidden />
        <h3 className="mt-4 font-display text-heading text-ink">{t("form.sentTitle")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("form.sentBody")}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="btn-secondary mt-6 px-5 py-2.5 text-sm"
        >
          {t("form.sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby="careers-form-note">
      {/* Honeypot — hidden from humans, filled by bots. */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("form.name")} error={fieldError("name")} htmlFor="careers-name" required>
          <input
            id="careers-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={APPLICATION_LIMITS.name.max}
            className={`${inputClass} ${errors.name ? errorInputClass : ""}`}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>
        <Field label={t("form.email")} error={fieldError("email")} htmlFor="careers-email" required>
          <input
            id="careers-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={APPLICATION_LIMITS.email.max}
            className={`${inputClass} ${errors.email ? errorInputClass : ""}`}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>
        <Field label={t("form.phone")} htmlFor="careers-phone" hint={t("form.optional")}>
          <input
            id="careers-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={APPLICATION_LIMITS.phone.max}
            className={inputClass}
          />
        </Field>
        <Field label={t("form.location")} htmlFor="careers-location" hint={t("form.optional")}>
          <input
            id="careers-location"
            name="location"
            type="text"
            autoComplete="address-level2"
            placeholder={t("form.locationPlaceholder")}
            maxLength={APPLICATION_LIMITS.location.max}
            className={inputClass}
          />
        </Field>
        <Field label={t("form.role")} error={fieldError("role")} htmlFor="careers-role" required>
          <select
            id="careers-role"
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as CareerRoleKey)}
            className={`${inputClass} ${errors.role ? errorInputClass : ""}`}
            aria-invalid={Boolean(errors.role)}
          >
            {CAREER_ROLE_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`roles.${key}.title`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("form.linkedin")} error={fieldError("linkedin")} htmlFor="careers-linkedin" hint={t("form.optional")}>
          <input
            id="careers-linkedin"
            name="linkedin"
            type="url"
            inputMode="url"
            placeholder="https://linkedin.com/in/…"
            maxLength={APPLICATION_LIMITS.url.max}
            className={`${inputClass} ${errors.linkedin ? errorInputClass : ""}`}
            aria-invalid={Boolean(errors.linkedin)}
          />
        </Field>
      </div>

      <Field label={t("form.cvUrl")} error={fieldError("cvUrl")} htmlFor="careers-cv" hint={t("form.cvHint")}>
        <input
          id="careers-cv"
          name="cvUrl"
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/…"
          maxLength={APPLICATION_LIMITS.url.max}
          className={`${inputClass} ${errors.cvUrl ? errorInputClass : ""}`}
          aria-invalid={Boolean(errors.cvUrl)}
        />
      </Field>

      <Field label={t("form.message")} error={fieldError("message")} htmlFor="careers-message" required hint={t("form.messageHint", { min: APPLICATION_LIMITS.message.min })}>
        <textarea
          id="careers-message"
          name="message"
          required
          rows={6}
          minLength={APPLICATION_LIMITS.message.min}
          maxLength={APPLICATION_LIMITS.message.max}
          className={`${inputClass} resize-y ${errors.message ? errorInputClass : ""}`}
          aria-invalid={Boolean(errors.message)}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="careers-form-note" className="text-xs leading-relaxed text-ink-dim">
          {t("form.privacyNote")}
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-accent shrink-0 px-6 py-3 disabled:opacity-60"
        >
          {status === "submitting" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {status === "submitting" ? t("form.submitting") : t("form.submit")}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>
          {label}
          {required && <span className="ms-0.5 text-cyan" aria-hidden>*</span>}
        </span>
        {hint && <span className="text-xs font-normal text-ink-dim">{hint}</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
