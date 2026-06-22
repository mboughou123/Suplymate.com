"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, AlertCircle, User as UserIcon } from "lucide-react";

type Initial = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  image: string;
};

export default function AccountForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const { update } = useSession();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set<K extends keyof Initial>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSuccess(false);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setStatus("saving");
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          company: form.company,
          jobTitle: form.jobTitle,
          phone: form.phone,
          image: form.image,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Could not save changes.");
        return;
      }
      setSuccess(true);
      // Refresh the session name so the dashboard greeting updates.
      await update?.();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  const initials =
    `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase() || "U";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
    >
      <h2 className="text-sm font-bold text-ink">Account information</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Update your profile details. Your email is used for sign-in and can&apos;t
        be changed here.
      </p>

      <div className="mt-5 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gold/15 text-lg font-bold text-ink">
          {form.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div className="flex-1">
          <label
            htmlFor="image"
            className="flex items-center gap-1.5 text-xs font-medium text-ink-muted"
          >
            <UserIcon className="h-3.5 w-3.5" aria-hidden />
            Profile picture URL
          </label>
          <input
            id="image"
            type="url"
            value={form.image}
            onChange={(e) => set("image", e.target.value)}
            placeholder="https://…"
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/15"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label="First name"
          value={form.firstName}
          onChange={(v) => set("firstName", v)}
          required
        />
        <Field
          id="lastName"
          label="Last name"
          value={form.lastName}
          onChange={(v) => set("lastName", v)}
        />
        <div className="sm:col-span-2">
          <label htmlFor="email" className="text-xs font-medium text-ink-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            disabled
            className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink-muted"
          />
        </div>
        <Field
          id="company"
          label="Company"
          value={form.company}
          onChange={(v) => set("company", v)}
        />
        <Field
          id="jobTitle"
          label="Job title"
          value={form.jobTitle}
          onChange={(v) => set("jobTitle", v)}
        />
        <Field
          id="phone"
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(v) => set("phone", v)}
        />
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          Your account was updated.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/15"
      />
    </div>
  );
}
