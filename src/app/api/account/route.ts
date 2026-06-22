import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function str(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.trim().slice(0, max);
}

// Update ONLY the authenticated user's own profile.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const firstName = str(body.firstName, 80);
  const lastName = str(body.lastName, 80);
  const company = str(body.company, 120);
  const jobTitle = str(body.jobTitle, 120);
  const phone = str(body.phone, 40);
  const image = str(body.image, 500);

  if (phone && !/^[0-9+()\-.\s]{5,40}$/.test(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid phone number." },
      { status: 400 }
    );
  }

  // Keep the legacy `name` field in sync when a name is provided.
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(company !== undefined ? { company: company || null } : {}),
        ...(jobTitle !== undefined ? { jobTitle: jobTitle || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(image !== undefined ? { image: image || null } : {}),
        ...(combinedName ? { name: combinedName } : {}),
      },
      select: {
        firstName: true,
        lastName: true,
        company: true,
        jobTitle: true,
        phone: true,
        image: true,
        name: true,
        email: true,
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch {
    return NextResponse.json(
      { error: "Could not update your account. Please try again." },
      { status: 500 }
    );
  }
}

// Permanently delete ONLY the authenticated user's own account.
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirm?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* allow empty body */
  }
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Account deletion must be explicitly confirmed." },
      { status: 400 }
    );
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete your account. Please try again." },
      { status: 500 }
    );
  }
}
