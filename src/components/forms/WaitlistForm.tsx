"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { submitWaitlistSignup } from "@/app/actions/inbound";
import { idleFormState } from "@/lib/form-validation";

function SubmitButton({ label }: { label: string }) {
  // useFormStatus must read from a parent <form>, so this lives in its own
  // component rather than inside the component that renders the form.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary shrink-0 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <ArrowRight className="h-4 w-4" aria-hidden />
      )}
      {label}
    </button>
  );
}

type WaitlistFormProps = {
  /** Recorded against the signup so interest can be attributed per page. */
  source: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  successMessage: string;
};

export default function WaitlistForm({
  source,
  label,
  placeholder,
  submitLabel,
  successMessage,
}: WaitlistFormProps) {
  const [state, formAction] = useActionState(
    submitWaitlistSignup,
    idleFormState
  );

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-body text-emerald-800"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
        {successMessage}
      </p>
    );
  }

  const emailError = state.fieldErrors?.email;

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="source" value={source} />

      {/* Honeypot: hidden from users and assistive tech, visible to naive bots. */}
      <div className="hidden" aria-hidden>
        <label htmlFor={`${source}-website`}>Website</label>
        <input
          id={`${source}-website`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label
        htmlFor={`${source}-email`}
        className="block text-caption font-medium text-ink-muted"
      >
        {label}
      </label>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id={`${source}-email`}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={placeholder}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${source}-email-error` : undefined}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-body text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 ${
            emailError
              ? "border-red-300 focus:border-red-400 focus:ring-red-200"
              : "border-slate-200 focus:border-cyan/50 focus:ring-cyan/20"
          }`}
        />
        <SubmitButton label={submitLabel} />
      </div>

      {emailError && (
        <p
          id={`${source}-email-error`}
          className="mt-2 flex items-center gap-1.5 text-caption text-red-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {emailError}
        </p>
      )}

      {state.message && (
        <p
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-caption text-red-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}
    </form>
  );
}
