import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { title, body: content, visibility, tags, folderId } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Players can only create PRIVATE or GM_SHARED (never SHARED — that would leak to all players)
  const allowedVisibilities = dbUser.role === "GM" ? ["PRIVATE", "SHARED", "GM_SHARED"] : ["PRIVATE", "GM_SHARED"];
  const vis = allowedVisibilities.includes(visibility) ? visibility : "PRIVATE";

  // Validate folder if provided: must be in campaign; if player-created note, only into public/own folders
  if (folderId) {
    const folder = await prisma.noteFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.campaignId !== dbUser.campaignId) {
      return NextResponse.json({ error: "Folder not found" }, { status: 400 });
    }
    if (dbUser.role !== "GM" && !folder.isPublic && folder.ownerId !== dbUser.id) {
      return NextResponse.json({ error: "Folder not visible" }, { status: 403 });
    }
  }

  const note = await prisma.note.create({
    data: {
      title: title.slice(0, 200),
      body: typeof content === "string" ? content.slice(0, 50000) : "",
      visibility: vis,
      tags: typeof tags === "string" ? tags : null,
      rtl: Boolean(body.rtl),
      folderId: folderId || null,
      authorId: dbUser.id,
      campaignId: dbUser.campaignId,
    },
  });

  return NextResponse.json(note, { status: 201 });
}