import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function gmUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const maps = await prisma.map.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(maps);
}

export async function POST(req: Request) {
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, description, imageUrl, widthPx, heightPx, parentId } = body;
  if (!name || typeof name !== "string") return bad("Name is required");
  if (!imageUrl || typeof imageUrl !== "string") return bad("Map image is required");
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) {
    return bad("Valid image dimensions required (widthPx, heightPx)");
  }

  if (parentId) {
    const parent = await prisma.map.findUnique({ where: { id: parentId } });
    if (!parent) return bad("Parent map not found");
    // Prevent cycles: parent cannot be a descendant of the new map (safety for reparent later)
  }

  const map = await prisma.map.create({
    data: {
      name: name.trim().slice(0, 200),
      description: typeof description === "string" ? description : null,
      imageUrl,
      widthPx: Math.round(widthPx),
      heightPx: Math.round(heightPx),
      parentId: parentId || null,
      campaignId: gm.campaignId,
    },
  });
  return NextResponse.json(map, { status: 201 });
}