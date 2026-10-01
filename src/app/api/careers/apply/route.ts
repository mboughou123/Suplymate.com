import { NextResponse } from "next/server";
import { validateApplication, validateCvFile, type CareerApplication } from "@/lib/careers";
import { escapeHtml, isMailerConfigured, sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

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

function renderText(app: CareerApplication, cvFileName: string | null): string {
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
    `CV file:   ${cvFileName ?? "—"}`,
    ``,
    `Message:`,
    app.message,
  ].join("\n");
}

function renderHtml(app: CareerApplication, cvFileName: string | null): string {
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
    ${row("CV file", cvFileName ? `${cvFileName} (attached)` : undefined)}
  </table>
  <h2 style="font-size:14px;margin:20px 0 6px;color:#475569">Message</h2>
  <p style="white-space:pre-wrap;line-height:1.6;font-size:14px;margin:0">${escapeHtml(app.message)}</p>
</div>`;
}

type CvUpload = { name: string; type: string; content: Buffer<ArrayBuffer> };

async function readSubmission(
  req: Request,
): Promise<{ fields: Record<string, unknown>; cv: File | null } | null> {
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const fields: Record<string, unknown> = {};
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") fields[key] = value;
      }
      const cv = form.get("cvFile");
      return { fields, cv: cv instanceof File && cv.size > 0 ? cv : null };
    }
    const body = await req.json();
    return { fields: body && typeof body === "object" ? body : {}, cv: null };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const submission = await readSubmission(req);
  if (!submission) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { fields } = submission;

  // Honeypot — bots fill every field; humans never see this one.
  if (fields.website) {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const result = validateApplication(fields);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  let cv: CvUpload | null = null;
  if (submission.cv) {
    const cvError = validateCvFile(submission.cv);
    if (cvError) {
      return NextResponse.json({ error: "validation", fields: { cvFile: cvError } }, { status: 400 });
    }
    cv = {
      name: submission.cv.name.slice(0, 120) || "cv.pdf",
      type: submission.cv.type || "application/octet-stream",
      content: Buffer.from(await submission.cv.arrayBuffer()),
    };
  }

  const app = result.data;
  const stored = await prisma.careerApplication
    .create({
      data: {
        ...app,
        cvFileName: cv?.name ?? null,
        cvFileType: cv?.type ?? null,
        cvFile: cv?.content ?? null,
      },
      select: { id: true },
    })
    .catch((err) => {
      console.error("[careers] could not store application:", err instanceof Error ? err.message : err);
      return null;
    });

  let emailed = false;
  if (isMailerConfigured()) {
    const sent = await sendMail({
      to: recipient(),
      replyTo: app.email,
      subject: `Careers application — ${app.name} (${app.role})`,
      text: renderText(app, cv?.name ?? null),
      html: renderHtml(app, cv?.name ?? null),
      attachments: cv ? [{ filename: cv.name, content: cv.content }] : undefined,
    });
    emailed = sent.ok;
    if (emailed && stored) {
      await prisma.careerApplication
        .update({ where: { id: stored.id }, data: { emailedAt: new Date() } })
        .catch(() => undefined);
    }
  } else {
    console.warn("[careers] RESEND_API_KEY not set — application stored but not emailed:", app.email);
  }

  if (!stored && !emailed) {
    return NextResponse.json({ error: "send_failed", to: recipient() }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
