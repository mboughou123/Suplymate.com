"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthFormLayout from "@/components/AuthFormLayout";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthFormLayout
      title="Sign in"
      subtitle="Access your Suplymate procurement dashboard."
      footer={
        <>
          <span className="text-ink-muted">No account? </span>
          <Link href="/signup" className="font-semibold text-ink hover:text-mustard">
            Sign up
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
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
            placeholder="demo@suplymate.com"
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-xs font-medium text-ink-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
          <Link
            href="/forgot-password"
            className="mt-2 inline-block text-xs font-medium text-ink hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mustard py-3 text-sm font-semibold text-ink hover:bg-mustard-light disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 rounded-lg bg-transparent px-3 py-2 text-xs text-ink-dim text-center">
        Demo: <strong>demo@suplymate.com</strong> / <strong>demo123</strong>
      </p>
    </AuthFormLayout>
  );
}
