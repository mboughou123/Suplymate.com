"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { submitSalesInquiry } from "@/app/actions/inbound";
import { idleFormState } from "@/lib/form-validation";

const TOPICS = [
  { value: "SUPPLIER_ONBOARDING", label: "Listing my company as a supplier" },
  { value: "BUYER_ENQUIRY", label: "Sourcing a product" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SUPPORT", label: "Support" },
  { value: "OTHER", label: "Something else" },
] as const;

const inputClass = (hasError: boolean) =>
  `mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-body text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-200"
      : "border-slate-200 focus:border-cyan/50 focus:ring-cyan/20"
  }`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-caption text-red-700">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Send className="h-4 w-4" aria-hidden />
      )}
      {pending ? "Sending" : "Send message"}
    </button>
  );
}

export default function SalesInquiryForm({
  source,
  defaultTopic = "OTHER",
}: {
  source: string;
  defaultTopic?: (typeof TOPICS)[number]["value"];
}) {
  const [state, formAction] = useActionState(submitSalesInquiry, idleFormState);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
      >
        <p className="flex items-center gap-2 text-body font-semibold text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          Message sent
        </p>
        <p className="mt-2 text-body text-emerald-800">
          We read every message and reply to most within two working days.
        </p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="source" value={source} />

      {/* Honeypot: hidden from users and assistive tech, visible to naive bots. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="inquiry-website">Website</label>
        <input
          id="inquiry-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="inquiry-name"
            className="text-caption font-medium text-ink-muted"
          >
            Your name
          </label>
          <input
            id="inquiry-name"
            name="name"
            required
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "inquiry-name-error" : undefined}
            className={inputClass(Boolean(errors.name))}
          />
          <FieldError id="inquiry-name-error" message={errors.name} />
        </div>

        <div>
          <label
            htmlFor="inquiry-email"
            className="text-caption font-medium text-ink-muted"
          >
            Work email
          </label>
          <input
            id="inquiry-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "inquiry-email-error" : undefined}
            className={inputClass(Boolean(errors.email))}
          />
          <FieldError id="inquiry-email-error" message={errors.email} />
        </div>

        <div>
          <label
            htmlFor="inquiry-company"
            className="text-caption font-medium text-ink-muted"
          >
            Company <span className="text-ink-dim">(optional)</span>
          </label>
          <input
            id="inquiry-company"
            name="company"
            autoComplete="organization"
            className={inputClass(false)}
          />
        </div>

        <div>
          <label
            htmlFor="inquiry-phone"
            className="text-caption font-medium text-ink-muted"
          >
            Phone <span className="text-ink-dim">(optional)</span>
          </label>
          <input
            id="inquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass(false)}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="inquiry-topic"
          className="text-caption font-medium text-ink-muted"
        >
          What is this about?
        </label>
        <select
          id="inquiry-topic"
          name="topic"
          defaultValue={defaultTopic}
          className={inputClass(false)}
        >
          {TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="inquiry-message"
          className="text-caption font-medium text-ink-muted"
        >
          Message
        </label>
        <textarea
          id="inquiry-message"
          name="message"
          required
          rows={5}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "inquiry-message-error" : undefined}
          className={inputClass(Boolean(errors.message))}
        />
        <FieldError id="inquiry-message-error" message={errors.message} />
      </div>

      {state.message && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
