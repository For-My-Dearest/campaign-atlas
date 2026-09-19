import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";
import CharacterForm from "@/components/CharacterForm";

export default async function NewCharacterPage() {
  const gm = await requireGM();
  const [locations, factions] = await Promise.all([
    prisma.location.findMany({
      where: { campaignId: gm.campaignId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.faction.findMany({
      where: { campaignId: gm.campaignId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <CharacterForm locations={locations} factions={factions} />;
}