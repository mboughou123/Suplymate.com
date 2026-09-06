import { NextResponse } from "next/server";
import { validateApplication, type CareerApplication } from "@/lib/careers";
import { escapeHtml, isMailerConfigured, sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

const DEFAULT_RECIPIENT = "info@suplymate.com";

/** Naive in-memory throttle: 5 submissions / 10 min per IP (per serverless instance). */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function recipient(): string {
  return (
    process.env.CAREERS_TO_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    DEFAULT_RECIPIENT
  );
}

function renderText(app: CareerApplication): string {
  return [
    `New application via suplymate.com/careers`,
    ``,
    `Name:      ${app.name}`,
    `Email:     ${app.email}`,
    `Phone:     ${app.phone ?? "—"}`,
    `Role:      ${app.role}`,
    `Location:  ${app.location ?? "—"}`,
    `LinkedIn:  ${app.linkedin ?? "—"}`,
    `CV link:   ${app.cvUrl ?? "—"}`,
    ``,
    `Message:`,
    app.message,
  ].join("\n");
}

function renderHtml(app: CareerApplication): string {
  const row = (label: string, value?: string, href?: string) => {
    const safe = value ? escapeHtml(value) : "—";
    const cell = href && value ? `<a href="${escapeHtml(href)}">${safe}</a>` : safe;
    return `<tr><td style="padding:6px 12px 6px 0;color:#64748B;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 0;color:#0F172A;font-size:14px">${cell}</td></tr>`;
  };
  return `
<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;color:#0F172A">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#0369A1;font-weight:600;margin:0 0 6px">Suplymate careers</p>
  <h1 style="font-size:20px;margin:0 0 16px">New application — ${escapeHtml(app.role)}</h1>
  <table style="border-collapse:collapse">
    ${row("Name", app.name)}
    ${row("Email", app.email, `mailto:${app.email}`)}
    ${row("Phone", app.phone)}
    ${row("Role", app.role)}
    ${row("Location", app.location)}
    ${row("LinkedIn", app.linkedin, app.linkedin)}
    ${row("CV link", app.cvUrl, app.cvUrl)}
  </table>
  <h2 style="font-size:14px;margin:20px 0 6px;color:#475569">Message</h2>
  <p style="white-space:pre-wrap;line-height:1.6;font-size:14px;margin:0">${escapeHtml(app.message)}</p>
</div>`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot — bots fill every field; humans never see this one.
  if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const result = validateApplication(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  if (!isMailerConfigured()) {
    console.warn("[careers] RESEND_API_KEY not set — application not delivered:", result.data.email);
    return NextResponse.json({ error: "mail_not_configured", to: recipient() }, { status: 503 });
  }

  const app = result.data;
  const sent = await sendMail({
    to: recipient(),
    replyTo: app.email,
    subject: `Careers application — ${app.name} (${app.role})`,
    text: renderText(app),
    html: renderHtml(app),
  });

  if (!sent.ok) {
    return NextResponse.json({ error: "send_failed", to: recipient() }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
