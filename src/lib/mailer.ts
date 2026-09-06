/**
 * Minimal transactional mailer.
 *
 * Uses the Resend HTTP API (https://resend.com) when RESEND_API_KEY is set.
 * No SDK dependency — a single fetch call keeps the serverless bundle small.
 *
 * Env:
 *   RESEND_API_KEY   required to actually send
 *   MAIL_FROM        sender, e.g. "Suplymate <careers@suplymate.com>"
 *                    (defaults to Resend's onboarding sender, which can only
 *                    deliver to the account owner's own address)
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Suplymate <onboarding@resend.dev>";

export type MailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type MailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not_configured" | "provider_error"; detail?: string };

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: message.replyTo,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[mailer] Resend responded ${res.status}: ${detail.slice(0, 300)}`);
      return { ok: false, reason: "provider_error", detail: `HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch (err) {
    console.error("[mailer] Failed to reach Resend:", err);
    return { ok: false, reason: "provider_error", detail: "network" };
  }
}

/** Escape a string for safe interpolation into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
