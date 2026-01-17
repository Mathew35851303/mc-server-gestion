import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { existsSync } from "fs";
import { createHash } from "crypto";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const SHADERPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "shaderpacks");

interface ShaderInfo {
  filename: string;
  size: number;
  sha256: string;
  url: string;
}

async function calculateSha256(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

// GET - Generate and return the shader manifest.json for launcher
// This endpoint is PUBLIC (no auth required) for launcher access
export async function GET() {
  try {
    if (!existsSync(SHADERPACKS_DIR)) {
      return NextResponse.json({
        version: "1.0.0",
        minecraft_version: process.env.MC_VERSION || "1.20.1",
        last_updated: new Date().toISOString(),
        shaders: [],
      });
    }

    const files = await readdir(SHADERPACKS_DIR, { withFileTypes: true });
    const shaders: ShaderInfo[] = [];
    let lastModified = new Date(0);

    for (const file of files) {
      if (file.isFile() && file.name.endsWith(".zip")) {
        const filePath = path.join(SHADERPACKS_DIR, file.name);
        const stats = await stat(filePath);
        const sha256 = await calculateSha256(filePath);

        shaders.push({
          filename: file.name,
          size: stats.size,
          sha256,
          url: `/api/shaders/serve/${encodeURIComponent(file.name)}`,
        });

        if (stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      }
    }

    // Sort alphabetically
    shaders.sort((a, b) => a.filename.localeCompare(b.filename));

    const manifest = {
      version: "1.0.0",
      minecraft_version: process.env.MC_VERSION || "1.20.1",
      last_updated: lastModified.toISOString(),
      shaders,
    };

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error generating shader manifest:", error);
    return NextResponse.json(
      { error: "Failed to generate shader manifest" },
      { status: 500 }
    );
  }
}
