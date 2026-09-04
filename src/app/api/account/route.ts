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
  // Business profile (additive)
  const username = str(body.username, 40)?.toLowerCase();
  const companyType = str(body.companyType, 60);
  const industry = str(body.industry, 60);
  const location = str(body.location, 120);
  const bio = str(body.bio, 1500);
  const procurementInterests = list(body.procurementInterests);
  const preferredMaterials = list(body.preferredMaterials);

  if (phone && !/^[0-9+()\-.\s]{5,40}$/.test(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid phone number." },
      { status: 400 }
    );
  }
  if (username && !/^[a-z0-9._]{3,40}$/.test(username)) {
    return NextResponse.json(
      { error: "Usernames use 3–40 letters, numbers, dots or underscores." },
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
        ...(username !== undefined ? { username: username || null } : {}),
        ...(companyType !== undefined ? { companyType: companyType || null } : {}),
        ...(industry !== undefined ? { industry: industry || null } : {}),
        ...(location !== undefined ? { location: location || null } : {}),
        ...(bio !== undefined ? { bio: bio || null } : {}),
        ...(procurementInterests !== undefined
          ? { procurementInterests: JSON.stringify(procurementInterests) }
          : {}),
        ...(preferredMaterials !== undefined
          ? { preferredMaterials: JSON.stringify(preferredMaterials) }
          : {}),
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
        username: true,
        companyType: true,
        industry: true,
        location: true,
        bio: true,
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not update your account. Please try again." },
      { status: 500 }
    );
  }
}

function list(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const s = item.trim().slice(0, 60);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= 30) break;
  }
  return out;
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
