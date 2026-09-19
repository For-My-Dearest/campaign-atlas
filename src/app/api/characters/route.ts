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

  const { name, description, portraitUrl, role, locationId, publicInfo, gmOnly, tags, factionId, status } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const character = await prisma.character.create({
    data: {
      name: name.slice(0, 200),
      description: description || null,
      portraitUrl: portraitUrl || null,
      role: role || null,
      locationId: locationId || null,
      publicInfo: publicInfo || null,
      gmOnly: gmOnly || null,
      tags: tags || null,
      factionId: factionId || null,
      status: status === "hidden" ? "hidden" : "active",
      campaignId: gm.campaignId,
    },
  });

  return NextResponse.json(character, { status: 201 });
}