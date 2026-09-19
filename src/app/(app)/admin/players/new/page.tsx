import { requireGM } from "@/lib/session";
import NewPlayerForm from "@/components/NewPlayerForm";

export default async function NewPlayerPage() {
  await requireGM();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-serif text-3xl text-amber-400">New Player</h1>
      <p className="text-sm text-stone-400">Create an account so a player can log in.</p>
      <NewPlayerForm />
    </div>
  );
}