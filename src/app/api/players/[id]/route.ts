import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

async function gmUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.email || user.role !== "GM") return null;
  return prisma.user.findUnique({ where: { email: user.email } });
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, email, password, role } = body;

  let newEmail = target.email;
  if (email && typeof email === "string" && email.trim() !== target.email) {
    const candidate = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return bad("Valid email required");
    const exists = await prisma.user.findUnique({ where: { email: candidate } });
    if (exists) return bad("Email already in use");
    newEmail = candidate;
  }

  let newRole = target.role;
  if (role === "GM" || role === "PLAYER") newRole = role;

  // Guards: cannot demote/delete the last GM; cannot change own ROLE here (own password is allowed)
  const gmCount = await prisma.user.count({ where: { role: "GM" } });

  if (target.role === "GM" && newRole !== "GM" && gmCount <= 1) {
    return bad("Cannot demote the only GM");
  }
  if (target.id === gm.id && newRole !== target.role) {
    return bad("Cannot change your own role here");
  }

  const data: any = {
    name: typeof name === "string" ? name.trim() || null : target.name,
    email: newEmail,
    role: newRole,
  };
  if (password && typeof password === "string" && password.length >= 6) {
    data.password = await bcrypt.hash(password, 10);
  } else if (password) {
    return bad("Password must be at least 6 characters");
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const gm = await gmUser();
  if (!gm) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.id === gm.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }
  if (target.role === "GM") {
    const gmCount = await prisma.user.count({ where: { role: "GM" } });
    if (gmCount <= 1) return NextResponse.json({ error: "Cannot delete the only GM" }, { status: 400 });
  }

  // Delete their notes and links, then the user
  await prisma.noteCharacterLink.deleteMany({ where: { note: { authorId: id } } });
  await prisma.noteLocationLink.deleteMany({ where: { note: { authorId: id } } });
  await prisma.noteFactionLink.deleteMany({ where: { note: { authorId: id } } });
  await prisma.note.deleteMany({ where: { authorId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}