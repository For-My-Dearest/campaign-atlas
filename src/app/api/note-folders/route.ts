import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function dbUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

// Folders visible to a user: GM → all campaign folders; player → public folders + own folders
async function visibleFolders(u: { id: string; role: string; campaignId: string }) {
  return prisma.noteFolder.findMany({
    where: {
      campaignId: u.campaignId,
      OR: u.role === "GM" ? undefined : [{ isPublic: true }, { ownerId: u.id }],
    },
    include: { _count: { select: { notes: true, children: true } } },
    orderBy: { name: "asc" },
  });
}

export async function GET() {
  const u = await dbUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await visibleFolders(u));
}

export async function POST(req: Request) {
  const u = await dbUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, parentId } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const isGM = u.role === "GM";

  // Validate parent: must be visible/ownable by this user
  if (parentId) {
    const parent = await prisma.noteFolder.findUnique({ where: { id: parentId } });
    if (!parent || parent.campaignId !== u.campaignId) {
      return NextResponse.json({ error: "Parent not found" }, { status: 400 });
    }
    if (!isGM && !parent.isPublic && parent.ownerId !== u.id) {
      return NextResponse.json({ error: "Parent not visible" }, { status: 403 });
    }
  }

  const folder = await prisma.noteFolder.create({
    data: {
      name: name.trim().slice(0, 100),
      parentId: parentId || null,
      campaignId: u.campaignId,
      // Player-created folders are personal (private, owned); GM-created are campaign/private
      isPublic: isGM ? Boolean(body.isPublic) : false,
      ownerId: isGM ? null : u.id,
    },
  });
  return NextResponse.json(folder, { status: 201 });
}