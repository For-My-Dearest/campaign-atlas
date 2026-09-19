import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";
import CharacterForm from "@/components/CharacterForm";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gm = await requireGM();

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) notFound();

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

  return (
    <CharacterForm
      characterId={character.id}
      initial={{
        name: character.name,
        description: character.description ?? "",
        portraitUrl: character.portraitUrl ?? "",
        role: character.role ?? "",
        locationId: character.locationId ?? "",
        publicInfo: character.publicInfo ?? "",
        gmOnly: character.gmOnly ?? "",
        tags: character.tags ?? "",
        factionId: character.factionId ?? "",
        status: character.status,
      }}
      locations={locations}
      factions={factions}
    />
  );
}