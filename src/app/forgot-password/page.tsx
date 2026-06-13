"use client";

import { useState } from "react";
import Link from "next/link";
import AuthFormLayout from "@/components/AuthFormLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <AuthFormLayout
      title="Reset password"
      subtitle="We'll send a reset link if an account exists for this email."
      footer={
        <Link href="/login" className="font-semibold text-ink hover:text-mustard">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          If an account exists for <strong>{email}</strong>, you will receive reset
          instructions. (Email delivery not configured in MVP.)
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-medium text-ink-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-mustard py-3 text-sm font-semibold text-ink hover:bg-mustard-light"
          >
            Send reset link
          </button>
        </form>
      )}
    </AuthFormLayout>
  );
}
