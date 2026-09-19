import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function gmUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.character.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.character.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name.slice(0, 200) : existing.name,
      description: typeof body.description === "string" ? body.description : existing.description,
      portraitUrl: typeof body.portraitUrl === "string" ? body.portraitUrl : existing.portraitUrl,
      role: typeof body.role === "string" ? body.role : existing.role,
      locationId: body.locationId === undefined ? existing.locationId : body.locationId,
      publicInfo: typeof body.publicInfo === "string" ? body.publicInfo : existing.publicInfo,
      gmOnly: typeof body.gmOnly === "string" ? body.gmOnly : existing.gmOnly,
      tags: typeof body.tags === "string" ? body.tags : existing.tags,
      factionId: body.factionId === undefined ? existing.factionId : body.factionId,
      status:
        body.status === "active" || body.status === "hidden" || body.status === "archived"
          ? body.status
          : existing.status,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.character.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft-delete: archive
  const updated = await prisma.character.update({
    where: { id },
    data: { status: "archived" },
  });

  return NextResponse.json({ ok: true, archived: updated.status === "archived" });
}