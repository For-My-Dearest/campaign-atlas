import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  // Search characters + locations + factions + notes within campaign
  const user = session.user as any;
  const campaignId = user.campaignId;
  const isGm = user.role === "GM";

  const [chars, locs, facts, notes] = await Promise.all([
    prisma.character.findMany({
      where: {
        campaignId,
        ...(isGm ? {} : { status: "active" }),
        OR: [{ name: { contains: q } }, { publicInfo: { contains: q } }],
      },
      select: { id: true, name: true, portraitUrl: true, role: true, status: true },
      take: 20,
    }),
    prisma.location.findMany({
      where: { campaignId, OR: [{ name: { contains: q } }, { publicInfo: { contains: q } }] },
      select: { id: true, name: true, parentId: true },
      take: 20,
    }),
    prisma.faction.findMany({
      where: { campaignId, OR: [{ name: { contains: q } }] },
      select: { id: true, name: true },
      take: 10,
    }),
    prisma.note.findMany({
      where: { OR: [{ title: { contains: q } }, { body: { contains: q } }], authorId: user.id },
      select: { id: true, title: true, visibility: true },
      take: 15,
    }),
  ]);

  return NextResponse.json({
    results: {
      characters: chars.map((c) => ({ type: "character", ...c })),
      locations: locs.map((l) => ({ type: "location", ...l })),
      factions: facts.map((f) => ({ type: "faction", ...f })),
      notes: notes.map((n) => ({ type: "note", ...n })),
    },
  });
}