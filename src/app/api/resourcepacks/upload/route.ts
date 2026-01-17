import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { createHash } from "crypto";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const RESOURCEPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "resourcepacks-custom");
const RESOURCEPACKS_CONFIG = path.join(MINECRAFT_DATA_PATH, "mc-admin-resourcepacks.json");

interface SelectedPack {
  id: string;
  name: string;
  icon: string | null;
  version: string;
  downloadUrl: string;
  filename: string;
  sha1: string;
  size: number;
  addedAt: string;
  isCustom?: boolean;
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

// POST - Upload a custom resource pack
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file extension
    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Invalid file type. Only .zip files are allowed" },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedFilename = path.basename(file.name);

    // Ensure resourcepacks directory exists
    if (!existsSync(RESOURCEPACKS_DIR)) {
      await mkdir(RESOURCEPACKS_DIR, { recursive: true });
    }

    const filePath = path.join(RESOURCEPACKS_DIR, sanitizedFilename);

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Calculate SHA1
    const sha1 = createHash("sha1").update(buffer).digest("hex");

    // Check if file already exists in config
    const config = await getConfig();
    const existingPack = config.selectedPacks.find(
      (p) => p.filename === sanitizedFilename || p.sha1 === sha1
    );

    if (existingPack) {
      return NextResponse.json(
        { error: "This resource pack already exists" },
        { status: 409 }
      );
    }

    // Write file
    await writeFile(filePath, buffer);

    // Generate unique ID for custom pack
    const customId = `custom-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Add to config
    const pack: SelectedPack = {
      id: customId,
      name: sanitizedFilename.replace(".zip", ""),
      icon: null,
      version: "custom",
      downloadUrl: `/api/resourcepacks/custom/${encodeURIComponent(sanitizedFilename)}`,
      filename: sanitizedFilename,
      sha1,
      size: file.size,
      addedAt: new Date().toISOString(),
      isCustom: true,
    };

    config.selectedPacks.push(pack);
    await saveConfig(config);

    return NextResponse.json({
      success: true,
      pack,
    });
  } catch (error) {
    console.error("Error uploading resource pack:", error);
    return NextResponse.json(
      { error: "Failed to upload resource pack" },
      { status: 500 }
    );
  }
}
