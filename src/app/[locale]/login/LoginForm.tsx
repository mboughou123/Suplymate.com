"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  normalizeCallbackUrl,
  postAuthAssignHref,
} from "@/lib/auth-post-login";
import { homeForRole, normalizeRole, type AccountRole } from "@/lib/roles";
import AuthFormLayout from "@/components/AuthFormLayout";
import RoleSelector from "@/components/auth/RoleSelector";

type SelectableRole = Exclude<AccountRole, "admin">;

export default function LoginForm() {
  const t = useTranslations("authentication");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl = normalizeCallbackUrl(rawCallback);
  const hasExplicitCallback = Boolean(rawCallback) && callbackUrl !== "/dashboard";
  const initialRole = normalizeRole(searchParams.get("role"));
  const [role, setRole] = useState<SelectableRole>(
    initialRole === "supplier" ? "supplier" : "buyer",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError(tErrors("missingCredentials"));
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      try {
        const health = await fetch("/api/health");
        const data = await health.json();
        if (!data.ok) {
          setError(tErrors("serverUnreachable"));
          return;
        }
      } catch {
        /* fall through to generic message */
      }
      setError(tErrors("invalidCredentials"));
      return;
    }

    // The account's stored role decides the workspace; the selector is a hint
    // (and the fallback when the identity lookup is unavailable).
    let accountRole: AccountRole = role;
    try {
      const me = await fetch("/api/account/me", { cache: "no-store" });
      if (me.ok) {
        const data = (await me.json()) as { role?: string };
        accountRole = normalizeRole(data.role);
      }
    } catch {
      /* keep selector hint */
    }

    const destination = hasExplicitCallback ? callbackUrl : homeForRole(accountRole);

    // Hard navigation so the session cookie is visible to the next server
    // render — soft router.push + refresh races auth() and bounces back to login.
    window.location.assign(postAuthAssignHref(locale, destination));
  }

  return (
    <AuthFormLayout
      title={t("signIn")}
      subtitle={role === "supplier" ? t("signInAsSupplierSubtitle") : t("signInAsBuyerSubtitle")}
      footer={
        <>
          <span className="text-ink-muted">{t("noAccount")} </span>
          <Link
            href={role === "supplier" ? "/signup?role=supplier" : "/signup"}
            className="font-semibold text-cyan hover:text-navy"
          >
            {t("signUp")}
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <RoleSelector value={role} onChange={setRole} disabled={loading} />

        <div>
          <label htmlFor="email" className="text-xs font-medium text-ink-muted">
            {tForms("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-xs font-medium text-ink-muted">
            {tForms("password")}
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-ink-dim transition hover:text-ink"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Link
            href="/forgot-password"
            className="mt-2 inline-block text-xs font-medium text-ink-muted hover:text-cyan hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? t("signingIn") : t("signIn")}
        </button>
      </form>
    </AuthFormLayout>
  );
}
