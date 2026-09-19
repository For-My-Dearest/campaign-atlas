import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import SearchBox from "@/components/SearchBox";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const isGM = user.role === "GM";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-800 bg-stone-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="font-serif text-lg tracking-wide text-amber-400">
            The World &amp; Kingdoms
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/" className="rounded px-3 py-1.5 hover:bg-stone-800">Map</Link>
            <Link href="/characters" className="rounded px-3 py-1.5 hover:bg-stone-800">Characters</Link>
            <Link href="/notes" className="rounded px-3 py-1.5 hover:bg-stone-800">Notes</Link>
            {isGM && (
              <Link href="/admin" className="rounded px-3 py-1.5 text-emerald-400 hover:bg-stone-800">
                GM Panel
              </Link>
            )}
          </nav>
          <SearchBox />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="rounded border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}