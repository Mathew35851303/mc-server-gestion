import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const RESOURCEPACKS_CONFIG = path.join(MINECRAFT_DATA_PATH, "mc-admin-resourcepacks.json");

export interface SelectedPack {
  id: string;
  name: string;
  icon: string | null;
  version: string;
  downloadUrl: string;
  filename: string;
  sha1: string;
  size: number;
  addedAt: string;
}

interface ResourcePackConfig {
  selectedPacks: SelectedPack[];
  generatedPack: {
    filename: string;
    sha1: string;
    generatedAt: string;
    url: string;
  } | null;
}

async function getConfig(): Promise<ResourcePackConfig> {
  try {
    if (existsSync(RESOURCEPACKS_CONFIG)) {
      const content = await readFile(RESOURCEPACKS_CONFIG, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading resourcepacks config:", error);
  }
  return { selectedPacks: [], generatedPack: null };
}

async function saveConfig(config: ResourcePackConfig): Promise<void> {
  const dir = path.dirname(RESOURCEPACKS_CONFIG);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(RESOURCEPACKS_CONFIG, JSON.stringify(config, null, 2));
}

// GET - Get selected resource packs list
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error getting resourcepacks:", error);
    return NextResponse.json(
      { error: "Failed to get resource packs" },
      { status: 500 }
    );
  }
}

// POST - Add a resource pack to the list
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const pack: SelectedPack = {
      id: body.id,
      name: body.name,
      icon: body.icon,
      version: body.version,
      downloadUrl: body.downloadUrl,
      filename: body.filename,
      sha1: body.sha1,
      size: body.size,
      addedAt: new Date().toISOString(),
    };

    const config = await getConfig();

    // Check if already exists
    if (config.selectedPacks.some((p) => p.id === pack.id)) {
      return NextResponse.json(
        { error: "Resource pack already in list" },
        { status: 400 }
      );
    }

    config.selectedPacks.push(pack);
    await saveConfig(config);

    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error("Error adding resourcepack:", error);
    return NextResponse.json(
      { error: "Failed to add resource pack" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a resource pack from the list
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    const config = await getConfig();
    config.selectedPacks = config.selectedPacks.filter((p) => p.id !== id);
    await saveConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing resourcepack:", error);
    return NextResponse.json(
      { error: "Failed to remove resource pack" },
      { status: 500 }
    );
  }
}
