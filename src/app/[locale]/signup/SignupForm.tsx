"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { postAuthAssignHref } from "@/lib/auth-post-login";
import { homeForRole, normalizeRole, type AccountRole } from "@/lib/roles";
import AuthFormLayout from "@/components/AuthFormLayout";
import RoleSelector from "@/components/auth/RoleSelector";

type SelectableRole = Exclude<AccountRole, "admin">;

export default function SignupForm() {
  const t = useTranslations("authentication");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const initialRole = normalizeRole(searchParams.get("role"));
  const [role, setRole] = useState<SelectableRole>(
    initialRole === "supplier" ? "supplier" : "buyer",
  );
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

    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company, role }),
      });
    } catch {
      setLoading(false);
      setError(tErrors("network"));
      return;
    }
    const data = await res.json().catch(() => ({}));
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

    // Hard navigation so the session cookie is visible to the next server
    // render — soft router.push + refresh races auth() and bounces back to login.
    window.location.assign(postAuthAssignHref(locale, homeForRole(role)));
  }

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20";

  return (
    <AuthFormLayout
      title={t("createAccount")}
      subtitle={role === "supplier" ? t("signUpAsSupplierSubtitle") : t("signUpAsBuyerSubtitle")}
      footer={
        <>
          <span className="text-ink-muted">{t("alreadyHaveAccount")} </span>
          <Link
            href={role === "supplier" ? "/login?role=supplier" : "/login"}
            className="font-semibold text-cyan hover:text-navy"
          >
            {t("signIn")}
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <RoleSelector value={role} onChange={setRole} disabled={loading} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-xs font-medium text-ink-muted">
              {tForms("fullName")}
            </label>
            <input
              id="name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="company" className="text-xs font-medium text-ink-muted">
              {role === "supplier" ? t("companyName") : tForms("companyOptional")}
            </label>
            <input
              id="company"
              required={role === "supplier"}
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
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
            className={inputClass}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? t("creatingAccount") : t("createAccount")}
        </button>
      </form>
    </AuthFormLayout>
  );
}
