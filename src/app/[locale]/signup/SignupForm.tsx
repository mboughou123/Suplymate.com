"use client";

import { useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { postAuthAssignHref } from "@/lib/auth-post-login";
import { homeForRole, normalizeRole } from "@/lib/roles";
import {
  getPasswordChecks,
  getPasswordStrength,
  validateSignup,
  type SignupErrorCode,
  type SignupField,
  type SignupFieldErrors,
  type SignupRole,
} from "@/lib/validation/signup";
import AuthFormLayout from "@/components/AuthFormLayout";
import RoleSelector from "@/components/auth/RoleSelector";
import PasswordRequirements from "@/components/auth/PasswordRequirements";

type RegisterErrorBody = {
  error?: string;
  code?: string;
  fields?: Partial<Record<SignupField, string>>;
  codes?: SignupFieldErrors;
};

type RegisterSuccessBody = {
  ok: true;
  user?: { id: string; email: string; name: string; role?: string };
};

type FormState = {
  name: string;
  company: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const INITIAL_FORM: FormState = {
  name: "",
  company: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const FIELD_ORDER: SignupField[] = [
  "role",
  "name",
  "company",
  "email",
  "password",
  "confirmPassword",
  "acceptTerms",
];

const INPUT_BASE =
  "mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50";
const INPUT_OK = "border-slate-200 focus:border-cyan/60 focus:ring-cyan/20";
const INPUT_ERROR = "border-red-300 focus:border-red-400 focus:ring-red-100";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export default function SignupForm() {
  const t = useTranslations("authentication");
  const tv = useTranslations("authentication.validation");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const initialRole = normalizeRole(searchParams.get("role"));

  const [role, setRole] = useState<SignupRole>(
    initialRole === "supplier" ? "supplier" : "buyer",
  );
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [serverFieldMessages, setServerFieldMessages] = useState<
    Partial<Record<SignupField, string>>
  >({});
  const [formError, setFormError] = useState<string>("");
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fieldRefs = useRef<Partial<Record<SignupField, HTMLElement | null>>>({});

  const passwordChecks = useMemo(() => getPasswordChecks(form.password), [form.password]);
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  function messageFor(field: SignupField): string | undefined {
    const code = fieldErrors[field];
    if (code) return tv(code as SignupErrorCode);
    return serverFieldMessages[field];
  }

  function clearFieldError(field: SignupField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerFieldMessages((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (field === "password" && fieldErrors.confirmPassword === "confirmMismatch") {
      clearFieldError("confirmPassword");
    }
    if (formError) setFormError("");
  }

  function focusFirstError(errors: SignupFieldErrors) {
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) fieldRefs.current[first]?.focus();
  }

  function applyServerErrors(data: RegisterErrorBody, status: number) {
    const codes = data.codes ?? {};
    const hasCodes = Object.keys(codes).length > 0;
    const hasFields = data.fields && Object.keys(data.fields).length > 0;

    if (hasCodes || hasFields) {
      setFieldErrors(codes);
      setServerFieldMessages(data.fields ?? {});
      setFormError(data.code === "emailTaken" ? "" : t("fixHighlightedFields"));
      if (data.code === "emailTaken") setShowLoginLink(true);
      focusFirstError(codes);
      return;
    }
    if (status === 503 || data.code === "dbUnavailable") {
      setFormError(tErrors("dbUnavailable"));
      return;
    }
    setFormError(data.error || tErrors("signupFailed"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError("");
    setShowLoginLink(false);

    const validation = validateSignup({ ...form, role });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setServerFieldMessages({});
      setFormError(t("fixHighlightedFields"));
      focusFirstError(validation.errors);
      return;
    }

    setPending(true);
    const payload = {
      ...validation.data,
      confirmPassword: form.confirmPassword,
      acceptTerms: form.acceptTerms,
    };

    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setPending(false);
      setFormError(tErrors("network"));
      return;
    }

    const data = (await res.json().catch(() => ({}))) as RegisterErrorBody | RegisterSuccessBody;
    if (!res.ok) {
      setPending(false);
      applyServerErrors(data as RegisterErrorBody, res.status);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: validation.data.email,
      password: validation.data.password,
      redirect: false,
    });
    if (signInResult?.error) {
      setPending(false);
      setFormError(tErrors("signInAfterSignup"));
      setShowLoginLink(true);
      return;
    }

    // The server's stored role is the source of truth for where the user lands.
    const serverRole = (data as RegisterSuccessBody).user?.role;
    const destination = homeForRole(serverRole ?? role);
    // Hard navigation so the session cookie is visible to the next server
    // render — soft router.push + refresh races auth() and bounces back to login.
    window.location.assign(postAuthAssignHref(locale, destination));
  }

  const nameError = messageFor("name");
  const companyError = messageFor("company");
  const emailError = messageFor("email");
  const passwordError = messageFor("password");
  const confirmError = messageFor("confirmPassword");
  const termsError = messageFor("acceptTerms");
  const roleError = messageFor("role");
  const loginHref = role === "supplier" ? "/login?role=supplier" : "/login";

  return (
    <AuthFormLayout
      title={t("createAccount")}
      subtitle={role === "supplier" ? t("signUpAsSupplierSubtitle") : t("signUpAsBuyerSubtitle")}
      footer={
        <>
          <span className="text-ink-muted">{t("alreadyHaveAccount")} </span>
          <Link href={loginHref} className="font-semibold text-cyan hover:text-navy">
            {t("signIn")}
          </Link>
        </>
      }
    >
      {formError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p>{formError}</p>
            {showLoginLink && (
              <Link href={loginHref} className="mt-1 inline-block font-semibold underline">
                {t("goToSignIn")}
              </Link>
            )}
          </div>
        </div>
      )}
      {!formError && showLoginLink && (
        <div className="mb-4 rounded-lg border border-cyan/20 bg-cyan-soft px-3 py-2.5 text-sm text-ink-muted">
          <span>{t("alreadyHaveAccount")} </span>
          <Link href={loginHref} className="font-semibold text-cyan underline">
            {t("goToSignIn")}
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <fieldset disabled={pending} className="space-y-5">
          <div>
            <RoleSelector
              value={role}
              onChange={(next) => {
                setRole(next);
                clearFieldError("role");
                if (next === "buyer") clearFieldError("company");
              }}
              disabled={pending}
            />
            <FieldError id="role-error" message={roleError} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="text-xs font-medium text-ink-muted">
                {tForms("fullName")}
              </label>
              <input
                id="name"
                ref={(el) => {
                  fieldRefs.current.name = el;
                }}
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "name-error" : undefined}
                className={`${INPUT_BASE} ${nameError ? INPUT_ERROR : INPUT_OK}`}
              />
              <FieldError id="name-error" message={nameError} />
            </div>
            <div>
              <label htmlFor="company" className="text-xs font-medium text-ink-muted">
                {role === "supplier" ? t("companyName") : tForms("companyOptional")}
              </label>
              <input
                id="company"
                ref={(el) => {
                  fieldRefs.current.company = el;
                }}
                autoComplete="organization"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                aria-invalid={Boolean(companyError)}
                aria-describedby={companyError ? "company-error" : undefined}
                className={`${INPUT_BASE} ${companyError ? INPUT_ERROR : INPUT_OK}`}
              />
              <FieldError id="company-error" message={companyError} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-xs font-medium text-ink-muted">
              {tForms("email")}
            </label>
            <input
              id="email"
              ref={(el) => {
                fieldRefs.current.email = el;
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={t("emailPlaceholder")}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "email-error" : undefined}
              className={`${INPUT_BASE} ${emailError ? INPUT_ERROR : INPUT_OK}`}
            />
            <FieldError id="email-error" message={emailError} />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-ink-muted">
              {tForms("password")}
            </label>
            <div className="relative">
              <input
                id="password"
                ref={(el) => {
                  fieldRefs.current.password = el;
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={`password-requirements${passwordError ? " password-error" : ""}`}
                className={`${INPUT_BASE} pr-10 ${passwordError ? INPUT_ERROR : INPUT_OK}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 cursor-pointer rounded p-1 text-ink-dim transition hover:text-ink"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError id="password-error" message={passwordError} />
            <PasswordRequirements
              id="password-requirements"
              password={form.password}
              checks={passwordChecks}
              strength={passwordStrength}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-medium text-ink-muted">
              {t("confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              ref={(el) => {
                fieldRefs.current.confirmPassword = el;
              }}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              aria-invalid={Boolean(confirmError)}
              aria-describedby={confirmError ? "confirmPassword-error" : undefined}
              className={`${INPUT_BASE} ${confirmError ? INPUT_ERROR : INPUT_OK}`}
            />
            {!confirmError &&
              form.confirmPassword.length > 0 &&
              form.confirmPassword === form.password && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {t("passwordsMatch")}
                </p>
              )}
            <FieldError id="confirmPassword-error" message={confirmError} />
          </div>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
              <input
                type="checkbox"
                ref={(el) => {
                  fieldRefs.current.acceptTerms = el;
                }}
                checked={form.acceptTerms}
                onChange={(e) => update("acceptTerms", e.target.checked)}
                aria-invalid={Boolean(termsError)}
                aria-describedby={termsError ? "acceptTerms-error" : undefined}
                className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border accent-cyan ${
                  termsError ? "border-red-400" : "border-slate-300"
                }`}
              />
              <span>
                {t.rich("acceptTerms", {
                  terms: (chunks) => (
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-medium text-cyan underline-offset-2 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-medium text-cyan underline-offset-2 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>
            <FieldError id="acceptTerms-error" message={termsError} />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? t("creatingAccount") : t("createAccount")}
        </button>
      </form>
    </AuthFormLayout>
  );
}
