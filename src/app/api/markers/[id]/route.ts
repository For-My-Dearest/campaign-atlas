import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const marker = await prisma.mapMarker.findUnique({ where: { id } });
  if (!marker) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mapMarker.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}