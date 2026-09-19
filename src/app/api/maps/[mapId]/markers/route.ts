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

// List markers on a map (any authenticated user)
export async function GET(_req: Request, { params }: Params) {
  const { mapId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { markers: { include: { character: { select: { id: true, name: true, portraitUrl: true } } } } },
  });
  if (!map) return NextResponse.json({ error: "Map not found" }, { status: 404 });

  const markers = map.markers.map((m) => ({
    id: m.id,
    type: m.type,
    label: m.label,
    x: m.xNormalized,
    y: m.yNormalized,
    characterId: m.characterId ?? undefined,
    locationId: m.locationId ?? undefined,
    portraitUrl: m.character?.portraitUrl ?? null,
  }));
  return NextResponse.json(markers);
}

// Create a marker (GM only)
export async function POST(req: Request, { params }: Params) {
  const { mapId } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const map = await prisma.map.findUnique({ where: { id: mapId } });
  if (!map) return NextResponse.json({ error: "Map not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { type, label, x, y, characterId, locationId } = body;
  if (typeof x !== "number" || typeof y !== "number") {
    return NextResponse.json({ error: "Coordinates required" }, { status: 400 });
  }
  const nx = Math.min(1, Math.max(0, x));
  const ny = Math.min(1, Math.max(0, y));

  // Prevent duplicate marker for same entity on same map
  if (characterId || locationId) {
    const dup = await prisma.mapMarker.findFirst({
      where: {
        mapId,
        ...(characterId ? { characterId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: { character: { select: { portraitUrl: true } } },
    });
    if (dup) {
      // Move it instead of duplicate
      const moved = await prisma.mapMarker.update({
        where: { id: dup.id },
        data: { xNormalized: nx, yNormalized: ny },
      });
      return NextResponse.json({
        id: moved.id,
        type: moved.type,
        label: moved.label,
        x: moved.xNormalized,
        y: moved.yNormalized,
        characterId: moved.characterId ?? undefined,
        locationId: moved.locationId ?? undefined,
        portraitUrl: dup.character?.portraitUrl ?? null,
      });
    }
  }

  const character = characterId
    ? await prisma.character.findUnique({ where: { id: characterId }, select: { portraitUrl: true } })
    : null;

  const marker = await prisma.mapMarker.create({
    data: {
      type: type || "custom",
      label: label || null,
      xNormalized: nx,
      yNormalized: ny,
      mapId,
      characterId: characterId || null,
      locationId: locationId || null,
    },
  });

  return NextResponse.json(
    {
      id: marker.id,
      type: marker.type,
      label: marker.label,
      x: marker.xNormalized,
      y: marker.yNormalized,
      characterId: marker.characterId ?? undefined,
      locationId: marker.locationId ?? undefined,
      portraitUrl: character?.portraitUrl ?? null,
    },
    { status: 201 }
  );
}