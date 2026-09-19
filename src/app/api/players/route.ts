import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function gmUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: Request) {
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, email, password, role } = body;
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad("Valid email required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return bad("Password must be at least 6 characters");
  }
  const normalized = email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalized } });
  if (exists) return bad("Email already in use");

  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: normalized,
      password: await bcrypt.hash(password, 10),
      role: role === "GM" ? "GM" : "PLAYER",
      campaignId: gm.campaignId,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json(user, { status: 201 });
}