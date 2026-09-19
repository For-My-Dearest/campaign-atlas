import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already logged in? Go to atlas.
  const session = await requireUser().catch(() => null);
  if (session) redirect("/");
  const sp = await searchParams;
  const error = sp.error;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-stone-950 text-stone-100">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-serif mb-1">The World &amp; Kingdoms</h1>
        <p className="text-stone-400 mb-6">Enter the campaign atlas.</p>
        <form
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirectTo: "/",
              });
            } catch (err) {
              // NextAuth throws CredentialsSignin on bad credentials.
              // Redirect to /login?error=1 to show a friendly message.
              const isCredentialsError =
                (err as Error)?.name === "CredentialsSignin" ||
                String((err as Error)?.message).includes("CredentialsSignin");
              if (isCredentialsError) {
                redirect("/login?error=1");
              }
              throw err;
            }
          }}
          className="space-y-3"
        >
          <label className="block text-sm">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>
          {error && (
            <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">
              Invalid email or password. Try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-amber-600 py-2 font-semibold text-stone-950 hover:bg-amber-500"
          >
            Sign In
          </button>
        </form>
        <p className="mt-4 text-xs text-stone-500">
          Demo accounts: gm@campaign.test / gm-secret · player1@campaign.test / player-secret
        </p>
      </div>
    </main>
  );
}