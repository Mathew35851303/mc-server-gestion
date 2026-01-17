import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import path from "path";
import { createHash } from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const RESOURCEPACKS_CONFIG = path.join(MINECRAFT_DATA_PATH, "mc-admin-resourcepacks.json");
const RESOURCEPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "resourcepacks");
const GENERATED_PACK_NAME = "server-resourcepack.zip";
const SERVER_PROPERTIES_PATH = process.env.MC_PROPERTIES_PATH || path.join(MINECRAFT_DATA_PATH, "server.properties");

interface SelectedPack {
  id: string;
  name: string;
  downloadUrl: string;
  filename: string;
  sha1: string;
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
  await writeFile(RESOURCEPACKS_CONFIG, JSON.stringify(config, null, 2));
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const fileStream = createWriteStream(dest);
  // Convert web ReadableStream to Node.js Readable
  const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
  await pipeline(nodeStream, fileStream);
}

async function calculateSha1(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha1").update(content).digest("hex");
}

async function updateServerProperties(packUrl: string, sha1: string): Promise<void> {
  let content = "";

  if (existsSync(SERVER_PROPERTIES_PATH)) {
    content = await readFile(SERVER_PROPERTIES_PATH, "utf-8");
  }

  // Update or add resource-pack property
  if (content.includes("resource-pack=")) {
    content = content.replace(/resource-pack=.*/g, `resource-pack=${packUrl}`);
  } else {
    content += `\nresource-pack=${packUrl}`;
  }

  // Update or add resource-pack-sha1 property
  if (content.includes("resource-pack-sha1=")) {
    content = content.replace(/resource-pack-sha1=.*/g, `resource-pack-sha1=${sha1}`);
  } else {
    content += `\nresource-pack-sha1=${sha1}`;
  }

  // Ensure require-resource-pack is set
  if (content.includes("require-resource-pack=")) {
    content = content.replace(/require-resource-pack=.*/g, "require-resource-pack=false");
  } else {
    content += `\nrequire-resource-pack=false`;
  }

  await writeFile(SERVER_PROPERTIES_PATH, content);
}

// POST - Generate merged resource pack
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getConfig();

    if (config.selectedPacks.length === 0) {
      return NextResponse.json(
        { error: "No resource packs selected" },
        { status: 400 }
      );
    }

    // Create resourcepacks directory
    if (!existsSync(RESOURCEPACKS_DIR)) {
      await mkdir(RESOURCEPACKS_DIR, { recursive: true });
    }

    // For single pack, just download and use it directly
    if (config.selectedPacks.length === 1) {
      const pack = config.selectedPacks[0];
      const destPath = path.join(RESOURCEPACKS_DIR, GENERATED_PACK_NAME);

      // Download the pack
      await downloadFile(pack.downloadUrl, destPath);

      // Calculate SHA1
      const sha1 = await calculateSha1(destPath);

      // The URL where the pack will be served
      // This assumes you have a route to serve static files from resourcepacks dir
      const packUrl = `/api/resourcepacks/serve/${GENERATED_PACK_NAME}`;

      // Update server.properties
      await updateServerProperties(packUrl, sha1);

      // Save config
      config.generatedPack = {
        filename: GENERATED_PACK_NAME,
        sha1,
        generatedAt: new Date().toISOString(),
        url: packUrl,
      };
      await saveConfig(config);

      return NextResponse.json({
        success: true,
        message: "Resource pack generated successfully",
        pack: config.generatedPack,
      });
    }

    // For multiple packs, we need to merge them
    // This requires extracting zips and merging contents
    const JSZip = (await import("jszip")).default;
    const mergedZip = new JSZip();

    // Track pack.mcmeta to merge properly
    let packMcmeta: { pack: { pack_format: number; description: string } } | null = null;

    // Download and extract each pack
    for (const pack of config.selectedPacks) {
      const tempPath = path.join(RESOURCEPACKS_DIR, `temp_${pack.id}.zip`);

      try {
        // Download
        await downloadFile(pack.downloadUrl, tempPath);

        // Read zip
        const zipData = await readFile(tempPath);
        const zip = await JSZip.loadAsync(zipData);

        // Extract and add to merged zip
        for (const [filename, file] of Object.entries(zip.files)) {
          if (file.dir) continue;

          // Special handling for pack.mcmeta - use the first one
          if (filename === "pack.mcmeta" && !packMcmeta) {
            const content = await file.async("string");
            packMcmeta = JSON.parse(content);
            continue;
          }

          // Skip pack.mcmeta from other packs
          if (filename === "pack.mcmeta") continue;

          // Add file to merged zip (later packs override earlier ones)
          const content = await file.async("nodebuffer");
          mergedZip.file(filename, content);
        }

        // Clean up temp file
        await rm(tempPath);
      } catch (error) {
        console.error(`Error processing pack ${pack.id}:`, error);
        // Clean up on error
        if (existsSync(tempPath)) {
          await rm(tempPath);
        }
      }
    }

    // Add merged pack.mcmeta
    if (packMcmeta) {
      packMcmeta.pack.description = `Merged pack: ${config.selectedPacks.map((p) => p.name).join(", ")}`;
      mergedZip.file("pack.mcmeta", JSON.stringify(packMcmeta, null, 2));
    } else {
      // Create default pack.mcmeta
      mergedZip.file(
        "pack.mcmeta",
        JSON.stringify(
          {
            pack: {
              pack_format: 15, // 1.20.x
              description: `Merged pack: ${config.selectedPacks.map((p) => p.name).join(", ")}`,
            },
          },
          null,
          2
        )
      );
    }

    // Generate final zip
    const destPath = path.join(RESOURCEPACKS_DIR, GENERATED_PACK_NAME);
    const mergedContent = await mergedZip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    await writeFile(destPath, mergedContent);

    // Calculate SHA1
    const sha1 = await calculateSha1(destPath);

    // The URL where the pack will be served
    const packUrl = `/api/resourcepacks/serve/${GENERATED_PACK_NAME}`;

    // Update server.properties
    await updateServerProperties(packUrl, sha1);

    // Save config
    config.generatedPack = {
      filename: GENERATED_PACK_NAME,
      sha1,
      generatedAt: new Date().toISOString(),
      url: packUrl,
    };
    await saveConfig(config);

    return NextResponse.json({
      success: true,
      message: `Merged ${config.selectedPacks.length} resource packs successfully`,
      pack: config.generatedPack,
    });
  } catch (error) {
    console.error("Error generating resource pack:", error);
    return NextResponse.json(
      { error: "Failed to generate resource pack" },
      { status: 500 }
    );
  }
}
