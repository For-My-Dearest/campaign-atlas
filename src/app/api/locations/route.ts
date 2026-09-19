import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function gmUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

export async function POST(req: Request) {
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, description, parentId, publicInfo, gmOnly, tags } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: name.slice(0, 200),
      description: description || null,
      parentId: parentId || null,
      publicInfo: publicInfo || null,
      gmOnly: gmOnly || null,
      tags: tags || null,
      campaignId: gm.campaignId,
    },
  });

  return NextResponse.json(location, { status: 201 });
}