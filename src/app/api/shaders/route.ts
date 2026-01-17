import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readdir, unlink, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const SHADERPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "shaderpacks");

export interface InstalledShader {
  filename: string;
  size: number;
}

// GET - List installed shaders
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!existsSync(SHADERPACKS_DIR)) {
      return NextResponse.json({ shaders: [] });
    }

    const files = await readdir(SHADERPACKS_DIR, { withFileTypes: true });
    const shaders: InstalledShader[] = [];

    for (const file of files) {
      if (file.isFile() && file.name.endsWith(".zip")) {
        const filePath = path.join(SHADERPACKS_DIR, file.name);
        const stats = await stat(filePath);
        shaders.push({
          filename: file.name,
          size: stats.size,
        });
      }
    }

    // Sort alphabetically
    shaders.sort((a, b) => a.filename.localeCompare(b.filename));

    return NextResponse.json({ shaders });
  } catch (error) {
    console.error("Error listing shaders:", error);
    return NextResponse.json(
      { error: "Failed to list shaders" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a shader
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename required" },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(SHADERPACKS_DIR, sanitizedFilename);

    // Security check
    if (!filePath.startsWith(SHADERPACKS_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Shader not found" }, { status: 404 });
    }

    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: `${sanitizedFilename} supprimé`,
    });
  } catch (error) {
    console.error("Error removing shader:", error);
    return NextResponse.json(
      { error: "Failed to remove shader" },
      { status: 500 }
    );
  }
}
