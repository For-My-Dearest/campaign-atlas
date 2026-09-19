import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Create a note linked to this character (auth required)
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  const character = await prisma.character.findUnique({ where: { id } });
  if (!dbUser || !character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || !body.body || typeof body.body !== "string") {
    return NextResponse.json({ error: "Note body required" }, { status: 400 });
  }
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const vis = ["PRIVATE", "SHARED", "GM_SHARED"].includes(body.visibility) ? body.visibility : "PRIVATE";

  const note = await prisma.note.create({
    data: {
      title: body.title.slice(0, 200),
      body: body.body.slice(0, 50000),
      visibility: vis,
      authorId: dbUser.id,
      campaignId: dbUser.campaignId,
      characters: {
        create: { characterId: character.id },
      },
    },
  });

  return NextResponse.json(note, { status: 201 });
}