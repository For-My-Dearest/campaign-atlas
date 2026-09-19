import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ mapId: string }> };

async function gmUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

async function isDescendant(prismaCtx: typeof prisma, candidateId: string, ancestorId: string): Promise<boolean> {
  // True if candidateId is a descendant of ancestorId (candidate itself excluded)
  if (candidateId === ancestorId) return true;
  const children = await prismaCtx.map.findMany({
    where: { parentId: ancestorId },
    select: { id: true },
  });
  for (const c of children) {
    if (await isDescendant(prismaCtx, candidateId, c.id)) return true;
  }
  return false;
}

export async function PUT(req: Request, { params }: Params) {
  const { mapId: id } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const map = await prisma.map.findUnique({ where: { id } });
  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, description, imageUrl, widthPx, heightPx, parentId } = body;

  // Parent validation (null = root)
  let newParentId = map.parentId;
  if (parentId !== undefined) {
    newParentId = parentId === null || parentId === "" ? null : parentId;
    if (newParentId) {
      if (newParentId === id) return bad("A map cannot be its own parent");
      const parent = await prisma.map.findUnique({ where: { id: newParentId } });
      if (!parent) return bad("Parent map not found");
      if (await isDescendant(prisma, newParentId, id)) {
        return bad("Cannot move a map into its own descendant");
      }
    }
  }

  if (imageUrl !== undefined && (!imageUrl || typeof imageUrl !== "string")) {
    return bad("Valid image required");
  }
  if (
    widthPx !== undefined &&
    heightPx !== undefined &&
    (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0)
  ) {
    return bad("Valid image dimensions required");
  }

  const updated = await prisma.map.update({
    where: { id },
    data: {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : map.name,
      description: typeof description === "string" ? description : map.description,
      imageUrl: typeof imageUrl === "string" ? imageUrl : map.imageUrl,
      widthPx: Number.isFinite(widthPx) ? Math.round(widthPx) : map.widthPx,
      heightPx: Number.isFinite(heightPx) ? Math.round(heightPx) : map.heightPx,
      parentId: newParentId,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { mapId: id } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const map = await prisma.map.findUnique({ where: { id }, include: { _count: { select: { markers: true, children: true } } } });
  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (map._count.children > 0) {
    return NextResponse.json({ error: "Map has sub-maps. Move or delete them first." }, { status: 400 });
  }

  await prisma.mapMarker.deleteMany({ where: { mapId: id } });
  await prisma.map.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}