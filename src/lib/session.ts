import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  campaignId?: string;
};

export async function requireUser() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.email) redirect("/login");
  return user;
}

export async function requireGM() {
  const user = await requireUser();
  if (user.role !== "GM") redirect("/");
  return user;
}