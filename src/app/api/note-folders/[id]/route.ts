import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function dbUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

// Can this user manage (rename/move/delete) this folder?
// GM: any folder in campaign. Player: only folders they own.
async function canManage(u: { id: string; role: string; campaignId: string }, folder: { campaignId: string; ownerId: string | null }) {
  if (folder.campaignId !== u.campaignId) return false;
  if (u.role === "GM") return true;
  return folder.ownerId === u.id;
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const u = await dbUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = await prisma.noteFolder.findUnique({ where: { id } });
  if (!folder || folder.campaignId !== u.campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await canManage(u, folder))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, parentId } = body;

  // Validate parent
  let newParentId = folder.parentId;
  if (parentId !== undefined) {
    newParentId = parentId === null || parentId === "" ? null : parentId;
    if (newParentId) {
      if (newParentId === id) {
        return NextResponse.json({ error: "A folder cannot be its own parent" }, { status: 400 });
      }
      const parent = await prisma.noteFolder.findUnique({ where: { id: newParentId } });
      if (!parent || parent.campaignId !== u.campaignId) {
        return NextResponse.json({ error: "Parent not found" }, { status: 400 });
      }
      // Non-GM: can only nest under own folders or public folders
      if (u.role !== "GM" && !parent.isPublic && parent.ownerId !== u.id) {
        return NextResponse.json({ error: "Parent not visible" }, { status: 403 });
      }
      // Prevent cycles: new parent must not be a descendant of this folder
      const isDescendant = async (candidate: string, ancestor: string): Promise<boolean> => {
        if (candidate === ancestor) return true;
        const kids = await prisma.noteFolder.findMany({ where: { parentId: ancestor }, select: { id: true } });
        for (const k of kids) {
          if (await isDescendant(candidate, k.id)) return true;
        }
        return false;
      };
      if (await isDescendant(newParentId, id)) {
        return NextResponse.json({ error: "Cannot move a folder into its own descendant" }, { status: 400 });
      }
    }
  }

  const updated = await prisma.noteFolder.update({
    where: { id },
    data: {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 100) : folder.name,
      parentId: newParentId,
      // Only GM can flip publicity
      isPublic: u.role === "GM" && typeof body.isPublic === "boolean" ? body.isPublic : folder.isPublic,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const u = await dbUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = await prisma.noteFolder.findUnique({
    where: { id },
    include: { _count: { select: { notes: true, children: true } } },
  });
  if (!folder || folder.campaignId !== u.campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await canManage(u, folder))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (folder._count.notes > 0) {
    return NextResponse.json(
      { error: `Folder has ${folder._count.notes} note(s). Move or delete them first.` },
      { status: 400 }
    );
  }
  if (folder._count.children > 0) {
    return NextResponse.json(
      { error: `Folder has ${folder._count.children} sub-folder(s). Move or delete them first.` },
      { status: 400 }
    );
  }

  await prisma.noteFolder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}