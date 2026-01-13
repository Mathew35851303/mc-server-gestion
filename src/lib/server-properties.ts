import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

const PROPERTIES_PATH =
  process.env.MC_PROPERTIES_PATH || "/minecraft-data/server.properties";

export interface ServerProperty {
  key: string;
  value: string;
  type: "string" | "number" | "boolean";
  description?: string;
  category: string;
}

// Common server.properties with descriptions
export const PROPERTY_DEFINITIONS: Record<
  string,
  { type: "string" | "number" | "boolean"; description: string; category: string }
> = {
  "server-port": {
    type: "number",
    description: "Port du serveur",
    category: "network",
  },
  "max-players": {
    type: "number",
    description: "Nombre maximum de joueurs",
    category: "gameplay",
  },
  motd: {
    type: "string",
    description: "Message du jour affiché dans la liste des serveurs",
    category: "general",
  },
  "level-name": {
    type: "string",
    description: "Nom du monde",
    category: "world",
  },
  "level-seed": {
    type: "string",
    description: "Seed du monde",
    category: "world",
  },
  gamemode: {
    type: "string",
    description: "Mode de jeu par défaut (survival, creative, adventure, spectator)",
    category: "gameplay",
  },
  difficulty: {
    type: "string",
    description: "Difficulté (peaceful, easy, normal, hard)",
    category: "gameplay",
  },
  hardcore: {
    type: "boolean",
    description: "Mode hardcore",
    category: "gameplay",
  },
  pvp: {
    type: "boolean",
    description: "PvP activé",
    category: "gameplay",
  },
  "allow-flight": {
    type: "boolean",
    description: "Autoriser le vol (survie)",
    category: "gameplay",
  },
  "spawn-monsters": {
    type: "boolean",
    description: "Apparition des monstres",
    category: "world",
  },
  "spawn-animals": {
    type: "boolean",
    description: "Apparition des animaux",
    category: "world",
  },
  "spawn-npcs": {
    type: "boolean",
    description: "Apparition des villageois",
    category: "world",
  },
  "enable-command-block": {
    type: "boolean",
    description: "Activer les command blocks",
    category: "gameplay",
  },
  "white-list": {
    type: "boolean",
    description: "Whitelist activée",
    category: "security",
  },
  "enforce-whitelist": {
    type: "boolean",
    description: "Forcer la whitelist (kick les non-whitelistés)",
    category: "security",
  },
  "online-mode": {
    type: "boolean",
    description: "Vérification des comptes Minecraft",
    category: "security",
  },
  "view-distance": {
    type: "number",
    description: "Distance de rendu (chunks)",
    category: "performance",
  },
  "simulation-distance": {
    type: "number",
    description: "Distance de simulation (chunks)",
    category: "performance",
  },
  "max-tick-time": {
    type: "number",
    description: "Temps max par tick avant crash (-1 pour désactiver)",
    category: "performance",
  },
};

export async function readServerProperties(): Promise<Record<string, string>> {
  if (!existsSync(PROPERTIES_PATH)) {
    console.warn(`server.properties not found at ${PROPERTIES_PATH}`);
    return {};
  }

  const content = await readFile(PROPERTIES_PATH, "utf-8");
  const properties: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (key) {
      properties[key] = valueParts.join("=");
    }
  }

  return properties;
}

export async function writeServerProperties(
  updates: Record<string, string>
): Promise<void> {
  if (!existsSync(PROPERTIES_PATH)) {
    throw new Error(`server.properties not found at ${PROPERTIES_PATH}`);
  }

  const content = await readFile(PROPERTIES_PATH, "utf-8");
  const lines = content.split("\n");
  const updatedLines: string[] = [];
  const handledKeys = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      updatedLines.push(line);
      continue;
    }

    const [key] = trimmed.split("=");
    if (key && key in updates) {
      updatedLines.push(`${key}=${updates[key]}`);
      handledKeys.add(key);
    } else {
      updatedLines.push(line);
    }
  }

  // Add any new properties that weren't in the file
  for (const [key, value] of Object.entries(updates)) {
    if (!handledKeys.has(key)) {
      updatedLines.push(`${key}=${value}`);
    }
  }

  await writeFile(PROPERTIES_PATH, updatedLines.join("\n"));
}

export function getServerPropertiesWithMeta(): ServerProperty[] {
  return Object.entries(PROPERTY_DEFINITIONS).map(([key, def]) => ({
    key,
    value: "",
    ...def,
  }));
}
