import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Player places a public note into their own folder. Writes NotePlacement row.
// The note's canonical folderId (GM's layout) is NEVER touched.
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || !dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only players create placements; GM uses the canonical folderId directly
  if (dbUser.role === "GM") {
    return NextResponse.json({ error: "GM uses folder editing" }, { status: 400 });
  }

  // Player must be able to see this note to place it
  const canSee = note.authorId === dbUser.id || note.visibility === "SHARED";
  if (!canSee) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const folderId = body.folderId === null || body.folderId === "" ? null : body.folderId;

  // Validate folder: must be visible to this player (public or their own)
  if (folderId) {
    const folder = await prisma.noteFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.campaignId !== dbUser.campaignId) {
      return NextResponse.json({ error: "Folder not found" }, { status: 400 });
    }
    if (!folder.isPublic && folder.ownerId !== dbUser.id) {
      return NextResponse.json({ error: "Folder not visible" }, { status: 403 });
    }
  }

  // Upsert placement row
  if (folderId) {
    await prisma.notePlacement.upsert({
      where: { userId_noteId: { userId: dbUser.id, noteId: id } },
      create: { userId: dbUser.id, noteId: id, folderId },
      update: { folderId },
    });
  } else {
    await prisma.notePlacement.deleteMany({ where: { userId: dbUser.id, noteId: id } });
  }

  return NextResponse.json({ ok: true, folderId });
}