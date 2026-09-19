import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || !dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = note.authorId === dbUser.id;
  const isGM = dbUser.role === "GM";

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Permission model:
  // - Author: full edit (title/body/visibility/rtl/folder)
  // - GM: full edit of any note in campaign
  // - Other player: can ONLY move the note between folders (no content change)
  if (!isAuthor && !isGM) {
    const canView =
      note.visibility === "SHARED" ||
      (note.authorId === dbUser.id) ||
      (note.visibility === "GM_SHARED" && dbUser.role === "GM");
    // Player can only move a note they can see (public/SHARED or their own GM_SHARED)
    const readable = note.visibility === "SHARED" || note.visibility === "GM_SHARED";
    if (!readable) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Only folderId allowed; everything else must stay the same
    const touchesContent =
      ("title" in body && body.title !== note.title) ||
      ("body" in body && body.body !== note.body) ||
      ("visibility" in body && body.visibility !== note.visibility) ||
      ("rtl" in body && body.rtl !== note.rtl);
    if (touchesContent) {
      return NextResponse.json({ error: "You can only move this note to another folder" }, { status: 403 });
    }
  }

  // Validate folder move if provided
  let folderId = note.folderId;
  if (body.folderId !== undefined) {
    folderId = body.folderId === null || body.folderId === "" ? null : body.folderId;
    if (folderId) {
      const folder = await prisma.noteFolder.findUnique({ where: { id: folderId } });
      if (!folder || folder.campaignId !== dbUser.campaignId) {
        return NextResponse.json({ error: "Folder not found" }, { status: 400 });
      }
      // Non-GM non-author: can only move into folders they can see (public or own)
      if (!isAuthor && !isGM && !folder.isPublic && folder.ownerId !== dbUser.id) {
        return NextResponse.json({ error: "Folder not visible" }, { status: 403 });
      }
    }
  }

  const updated = await prisma.note.update({
    where: { id },
    data: {
      title: isAuthor || isGM ? (typeof body.title === "string" ? body.title.slice(0, 200) : note.title) : note.title,
      body: isAuthor || isGM ? (typeof body.body === "string" ? body.body.slice(0, 50000) : note.body) : note.body,
      visibility:
        isAuthor || isGM
          ? ["PRIVATE", "SHARED", "GM_SHARED"].includes(body.visibility)
            ? body.visibility
            : note.visibility
          : note.visibility,
      rtl: isAuthor || isGM ? (typeof body.rtl === "boolean" ? body.rtl : note.rtl) : note.rtl,
      folderId,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || !dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only author or GM can delete
  if (note.authorId !== dbUser.id && dbUser.role !== "GM") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Remove link rows first (FK constraint would block delete)
  await prisma.noteCharacterLink.deleteMany({ where: { noteId: id } });
  await prisma.noteLocationLink.deleteMany({ where: { noteId: id } });
  await prisma.noteFactionLink.deleteMany({ where: { noteId: id } });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}