import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Campaign ---
  const campaign = await prisma.campaign.upsert({
    where: { id: "campaign-atlas-2026" },
    update: {},
    create: {
      id: "campaign-atlas-2026",
      name: "The World & Kingdoms",
      description: "An interactive atlas of the campaign world.",
    },
  });

  // --- Users: GM + 2 players ---
  const gmPassword = await bcrypt.hash("gm-secret", 10);
  const player1Password = await bcrypt.hash("player-secret", 10);

  const gm = await prisma.user.upsert({
    where: { email: "gm@campaign.test" },
    update: { role: "GM" },
    create: {
      email: "gm@campaign.test",
      name: "Game Master",
      password: gmPassword,
      role: "GM",
      campaignId: campaign.id,
    },
  });

  const player1 = await prisma.user.upsert({
    where: { email: "player1@campaign.test" },
    update: {},
    create: {
      email: "player1@campaign.test",
      name: "Player One",
      password: player1Password,
      role: "PLAYER",
      campaignId: campaign.id,
    },
  });

  // --- Maps ---
  const maps: Record<string, { name: string; widthPx: number; heightPx: number; imageUrl: string; parentId?: string }> = {
    world: {
      name: "The World & Kingdoms",
      widthPx: 1536,
      heightPx: 1024,
      imageUrl: "/maps/The world & Kingdoms/The Etherium Archipelago.png",
    },
    solaris: {
      name: "Solaris",
      widthPx: 1536,
      heightPx: 1024,
      imageUrl: "/maps/The world & Kingdoms/Solaris.png",
      parentId: "world",
    },
    sylvanus: {
      name: "Sylvanus",
      widthPx: 1536,
      heightPx: 1024,
      imageUrl: "/maps/The world & Kingdoms/Sylvanus.png",
      parentId: "world",
    },
    frostfell: {
      name: "Frostfell",
      widthPx: 1536,
      heightPx: 1024,
      imageUrl: "/maps/The world & Kingdoms/Frostfell.png",
      parentId: "world",
    },
    aethdom: {
      name: "The Aethdom",
      widthPx: 1200,
      heightPx: 896,
      imageUrl: "/maps/The world & Kingdoms/The Aethdom.png",
      parentId: "world",
    },
    darkgarr: {
      name: "The Dark Garr",
      widthPx: 1536,
      heightPx: 1024,
      imageUrl: "/maps/The world & Kingdoms/The Dark Garr.png",
      parentId: "world",
    },
    arcadia: {
      name: "Arcadia",
      widthPx: 1254,
      heightPx: 1254,
      imageUrl: "/maps/Solaris/Arcadia.png",
      parentId: "solaris",
    },
  };

  const mapIds: Record<string, string> = {};
  for (const [key, m] of Object.entries(maps)) {
    const rec = await prisma.map.upsert({
      where: { id: `map-${key}` },
      update: {
        name: m.name,
        widthPx: m.widthPx,
        heightPx: m.heightPx,
        imageUrl: m.imageUrl,
        parentId: m.parentId ? `map-${m.parentId}` : undefined,
      },
      create: {
        id: `map-${key}`,
        name: m.name,
        widthPx: m.widthPx,
        heightPx: m.heightPx,
        imageUrl: m.imageUrl,
        campaignId: campaign.id,
        parentId: m.parentId ? `map-${m.parentId}` : undefined,
      },
    });
    mapIds[key] = rec.id;
  }

  // --- Locations (from character CURRENT LOCATION strings; all canonical) ---
  const locations: Record<string, { name: string; parentId?: string }> = {
    "city-gates": { name: "City Gates" },
    "silver-basin": { name: "The Silver Basin", parentId: "solaris" },
    "verdion-river": { name: "The Verdion River", parentId: "sylvanus" },
    "adventurers-guild": { name: "Adventurer's Guild", parentId: "solaris" },
    "blackwood-store": { name: "Blackwood General Store", parentId: "city-gates" },
  };

  const locationIds: Record<string, string> = {};
  for (const [key, l] of Object.entries(locations)) {
    const parent = l.parentId ? locationIds[l.parentId] : undefined;
    const rec = await prisma.location.upsert({
      where: { id: `loc-${key}` },
      update: { name: l.name, parentId: parent },
      create: {
        id: `loc-${key}`,
        name: l.name,
        campaignId: campaign.id,
        parentId: parent,
      },
    });
    locationIds[key] = rec.id;
  }

  // --- Characters (only info from the .md files) ---
  const characters = [
    {
      id: "char-sir-kai",
      name: "Sir Kai",
      portraitUrl: "/chars/sir-kai.jpg",
      locationId: "loc-city-gates",
      role: undefined,
      publicInfo: undefined,
      gmOnly: undefined,
    },
    {
      id: "char-rosie",
      name: "Rosie",
      portraitUrl: "/chars/rosie.jpg",
      locationId: "loc-silver-basin",
      role: undefined,
      publicInfo: undefined,
      gmOnly: undefined,
    },
    {
      id: "char-meriele",
      name: "Meriele Holymion",
      portraitUrl: "/chars/meriele.jpg",
      locationId: "loc-verdion-river",
      role: undefined,
      publicInfo:
        "Medium humanoid (half-elf), neutral good. Armor Class 16 (leather armor + Dex). Hit Points 31 (3d8 + 9). Speed 30 ft. STR 10, DEX 16, CON 16, INT 12, WIS 16, CHA 12. Saving Throws INT +3, WIS +5. Skills: Nature +3, Insight +5, Perception +5, Animal Handling +5. Darkvision 60 ft., passive Perception 15. Languages: Common, Elvish, Druidic. Circle of the Moon druid. Combat Wild Shape: CR 1 or lower (no flying until level 4).",
      gmOnly: undefined,
    },
    {
      id: "char-gron",
      name: "Gron Stonehammer",
      portraitUrl: "/chars/gron.jpg",
      locationId: "loc-adventurers-guild",
      role: undefined,
      publicInfo: undefined,
      gmOnly: undefined,
    },
    {
      id: "char-elara",
      name: "Elara Moongate",
      portraitUrl: "/chars/elara.jpg",
      locationId: "loc-adventurers-guild",
      role: undefined,
      publicInfo: undefined,
      gmOnly: undefined,
    },
    {
      id: "char-blackwood",
      name: "Blackwood Family",
      portraitUrl: "/chars/blackwood.jpg",
      locationId: "loc-blackwood-store",
      role: undefined,
      publicInfo: undefined,
      gmOnly: undefined,
    },
  ];

  for (const c of characters) {
    await prisma.character.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        portraitUrl: c.portraitUrl,
        locationId: c.locationId,
        publicInfo: c.publicInfo,
        gmOnly: c.gmOnly,
      },
      create: {
        id: c.id,
        name: c.name,
        portraitUrl: c.portraitUrl,
        locationId: c.locationId,
        publicInfo: c.publicInfo,
        gmOnly: c.gmOnly,
        campaignId: campaign.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("GM: gm@campaign.test / gm-secret");
  console.log("Player: player1@campaign.test / player-secret");
  console.log("Maps:", Object.keys(mapIds).length);
  console.log("Locations:", Object.keys(locationIds).length);
  console.log("Characters:", characters.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });