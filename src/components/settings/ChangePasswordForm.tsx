"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Uppercase & lowercase letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p) => /[0-9]/.test(p) },
];

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const allRulesPass = RULES.every((r) => r.test(next));
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && allRulesPass && matches && status === "idle";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!matches) {
      setError("New password and confirmation do not match.");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Could not change your password.");
        return;
      }
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
    >
      <h2 className="text-sm font-bold text-ink">Change password</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Use a strong, unique password you don&apos;t use anywhere else.
      </p>

      <div className="mt-5 space-y-4">
        <PasswordField
          id="current"
          label="Current password"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            setSuccess(false);
            setError(null);
          }}
          visible={show.current}
          onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
        />
        <PasswordField
          id="next"
          label="New password"
          value={next}
          onChange={(v) => {
            setNext(v);
            setSuccess(false);
            setError(null);
          }}
          visible={show.next}
          onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
        />
        {next.length > 0 && (
          <ul className="space-y-1">
            {RULES.map((rule) => {
              const ok = rule.test(next);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs ${
                    ok ? "text-emerald-600" : "text-ink-dim"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${ok ? "" : "opacity-30"}`} aria-hidden />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        )}
        <PasswordField
          id="confirm"
          label="Confirm new password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setSuccess(false);
            setError(null);
          }}
          visible={show.confirm}
          onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
        />
        {confirm.length > 0 && !matches && (
          <p className="text-xs text-red-600">Passwords do not match.</p>
        )}
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
          Your password has been updated.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {status === "saving" ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={id === "current" ? "current-password" : "new-password"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/15"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-dim transition hover:text-ink"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
