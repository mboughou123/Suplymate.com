"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthFormLayout from "@/components/AuthFormLayout";

export default function SignupPage() {
  const router = useRouter();
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
      setError(data.error || "Signup failed.");
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (signInResult?.error) {
      setError("Account created but sign-in failed. Please log in.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthFormLayout
      title="Create account"
      subtitle="Start sourcing smarter with Suplymate."
      footer={
        <>
          <span className="text-ink-muted">Already have an account? </span>
          <Link href="/login" className="font-semibold text-ink hover:text-mustard">
            Sign in
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
          <label htmlFor="name" className="text-xs font-medium text-ink-muted">
            Full name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
        </div>
        <div>
          <label htmlFor="company" className="text-xs font-medium text-ink-muted">
            Company (optional)
          </label>
          <input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
        </div>
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
        <div>
          <label htmlFor="password" className="text-xs font-medium text-ink-muted">
            Password (min 6 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mustard py-3 text-sm font-semibold text-ink hover:bg-mustard-light disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthFormLayout>
  );
}
