"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AuthFormLayout from "@/components/AuthFormLayout";

export default function SignupPage() {
  const t = useTranslations("authentication");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, company }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || tErrors("signupFailed"));
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (signInResult?.error) {
      setLoading(false);
      setError(tErrors("signInAfterSignup"));
      return;
    }
    // Hard navigate so the session cookie is visible to the next server render.
    window.location.assign(`/${locale}/onboarding`);
  }

  return (
    <AuthFormLayout
      title={t("createAccount")}
      subtitle={t("signUpSubtitle")}
      footer={
        <>
          <span className="text-ink-muted">{t("alreadyHaveAccount")} </span>
          <Link href="/login" className="font-semibold text-ink hover:text-gold">
            {t("signIn")}
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-xs font-medium text-ink-muted">
            {tForms("fullName")}
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label htmlFor="company" className="text-xs font-medium text-ink-muted">
            {tForms("companyOptional")}
          </label>
          <input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-xs font-medium text-ink-muted">
            {tForms("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-xs font-medium text-ink-muted">
            {t("passwordRequirements")}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {loading ? t("creatingAccount") : t("createAccount")}
        </button>
      </form>
    </AuthFormLayout>
  );
}
