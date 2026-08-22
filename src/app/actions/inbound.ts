"use server";

import { prisma } from "@/lib/prisma";
import {
  isHoneypotTripped,
  readChoice,
  readEmail,
  readOptionalString,
  readString,
  type FormState,
} from "@/lib/form-validation";

// Public, unauthenticated write endpoints. Both actions therefore cap field
// lengths, use a honeypot, and throttle repeat submissions per email.

const INQUIRY_TOPICS = [
  "SUPPLIER_ONBOARDING",
  "BUYER_ENQUIRY",
  "PARTNERSHIP",
  "SUPPORT",
  "OTHER",
] as const;

/** Minimum gap between inquiries from one address, to blunt form spam. */
const INQUIRY_THROTTLE_MS = 60_000;

/**
 * A tripped honeypot returns the success state rather than an error: telling a
 * bot it was detected invites another attempt with the field left blank.
 */
const SILENT_SUCCESS: FormState = { status: "success" };

export async function submitWaitlistSignup(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (isHoneypotTripped(formData)) return SILENT_SUCCESS;

  const email = readEmail(formData, "email");
  if (!email) {
    return {
      status: "error",
      fieldErrors: { email: "Enter a valid email address." },
    };
  }

  const source = readOptionalString(formData, "source", 64) ?? "unknown";

  try {
    // The [email, source] unique constraint makes re-submitting idempotent, so
    // a visitor who submits twice sees success rather than a duplicate-key error.
    await prisma.waitlistSignup.upsert({
      where: { email_source: { email, source } },
      update: {
        company: readOptionalString(formData, "company", 120) ?? undefined,
        country: readOptionalString(formData, "country", 80) ?? undefined,
        note: readOptionalString(formData, "note", 1000) ?? undefined,
      },
      create: {
        email,
        source,
        company: readOptionalString(formData, "company", 120),
        country: readOptionalString(formData, "country", 80),
        note: readOptionalString(formData, "note", 1000),
      },
    });
    return { status: "success" };
  } catch {
    return {
      status: "error",
      message: "We couldn't save your details. Please try again.",
    };
  }
}

export async function submitSalesInquiry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (isHoneypotTripped(formData)) return SILENT_SUCCESS;

  const fieldErrors: Record<string, string> = {};

  const name = readString(formData, "name", 120);
  if (!name) fieldErrors.name = "Tell us your name.";

  const email = readEmail(formData, "email");
  if (!email) fieldErrors.email = "Enter a valid email address.";

  const message = readString(formData, "message", 4000);
  if (!message) fieldErrors.message = "Add a short message.";
  else if (message.length < 10) {
    fieldErrors.message = "Add a little more detail (at least 10 characters).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const topic = readChoice(formData, "topic", INQUIRY_TOPICS, "OTHER");
  const source = readOptionalString(formData, "source", 64) ?? "unknown";

  try {
    const recent = await prisma.salesInquiry.findFirst({
      where: {
        email: email as string,
        createdAt: { gt: new Date(Date.now() - INQUIRY_THROTTLE_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      return {
        status: "error",
        message: "We already received that. We'll be in touch shortly.",
      };
    }

    await prisma.salesInquiry.create({
      data: {
        name: name as string,
        email: email as string,
        message: message as string,
        topic,
        source,
        company: readOptionalString(formData, "company", 120),
        phone: readOptionalString(formData, "phone", 40),
      },
    });
    return { status: "success" };
  } catch {
    return {
      status: "error",
      message: "We couldn't send your message. Please try again.",
    };
  }
}
