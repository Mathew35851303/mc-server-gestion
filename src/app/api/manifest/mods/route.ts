import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { existsSync } from "fs";
import { createHash } from "crypto";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const MODS_DIR = path.join(MINECRAFT_DATA_PATH, "mods");

interface ModInfo {
  filename: string;
  size: number;
  sha256: string;
  url: string;
}

async function calculateSha256(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

// GET - Generate and return the manifest.json for launcher
// This endpoint is PUBLIC (no auth required) for launcher access
export async function GET() {
  try {
    if (!existsSync(MODS_DIR)) {
      return NextResponse.json({
        version: "1.0.0",
        minecraft_version: process.env.MC_VERSION || "1.20.1",
        last_updated: new Date().toISOString(),
        mods: [],
      });
    }

    const files = await readdir(MODS_DIR, { withFileTypes: true });
    const mods: ModInfo[] = [];
    let lastModified = new Date(0);

    for (const file of files) {
      if (file.isFile() && file.name.endsWith(".jar")) {
        const filePath = path.join(MODS_DIR, file.name);
        const stats = await stat(filePath);
        const sha256 = await calculateSha256(filePath);

        mods.push({
          filename: file.name,
          size: stats.size,
          sha256,
          url: `/api/mods/serve/${encodeURIComponent(file.name)}`,
        });

        if (stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      }
    }

    // Sort alphabetically
    mods.sort((a, b) => a.filename.localeCompare(b.filename));

    const manifest = {
      version: "1.0.0",
      minecraft_version: process.env.MC_VERSION || "1.20.1",
      last_updated: lastModified.toISOString(),
      mods,
    };

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error generating manifest:", error);
    return NextResponse.json(
      { error: "Failed to generate manifest" },
      { status: 500 }
    );
  }
}
