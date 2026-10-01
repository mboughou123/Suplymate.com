/**
 * Minimal SMS sender using the Twilio Messages REST API (no SDK).
 *
 * Env:
 *   TWILIO_ACCOUNT_SID          required
 *   TWILIO_AUTH_TOKEN           required
 *   TWILIO_FROM_NUMBER          E.164 sender number, or
 *   TWILIO_MESSAGING_SERVICE_SID  messaging service (takes precedence)
 */

export type SmsResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not_configured" | "invalid_number" | "provider_error"; detail?: string };

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      (process.env.TWILIO_FROM_NUMBER?.trim() || process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()),
  );
}

/**
 * Normalise user input to E.164 ("+14155550123"). Requires an international
 * prefix ("+" or "00") because we cannot guess the country. Returns null when
 * the input is not a plausible phone number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^[+0-9()\-.\s]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!sid || !token || !(from || service)) return { ok: false, reason: "not_configured" };

  const number = normalizePhone(to);
  if (!number) return { ok: false, reason: "invalid_number" };

  const params = new URLSearchParams({ To: number, Body: body });
  if (service) params.set("MessagingServiceSid", service);
  else if (from) params.set("From", from);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[sms] Twilio responded ${res.status}: ${detail.slice(0, 300)}`);
      return { ok: false, reason: "provider_error", detail: `HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { sid?: string };
    return { ok: true, id: data.sid ?? null };
  } catch (err) {
    console.error("[sms] Failed to reach Twilio:", err);
    return { ok: false, reason: "provider_error", detail: "network" };
  }
}
