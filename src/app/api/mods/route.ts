import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const MODS_DIR = path.join(MINECRAFT_DATA_PATH, "mods");

export interface InstalledMod {
  filename: string;
  size: number;
}

// GET - List installed mods
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!existsSync(MODS_DIR)) {
      return NextResponse.json({ mods: [] });
    }

    const files = await readdir(MODS_DIR, { withFileTypes: true });
    const mods: InstalledMod[] = [];

    for (const file of files) {
      if (file.isFile() && file.name.endsWith(".jar")) {
        const filePath = path.join(MODS_DIR, file.name);
        const { stat } = await import("fs/promises");
        const stats = await stat(filePath);
        mods.push({
          filename: file.name,
          size: stats.size,
        });
      }
    }

    // Sort alphabetically
    mods.sort((a, b) => a.filename.localeCompare(b.filename));

    return NextResponse.json({ mods });
  } catch (error) {
    console.error("Error listing mods:", error);
    return NextResponse.json(
      { error: "Failed to list mods" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a mod
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
    const filePath = path.join(MODS_DIR, sanitizedFilename);

    // Security check
    if (!filePath.startsWith(MODS_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Mod not found" }, { status: 404 });
    }

    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: `${sanitizedFilename} supprimé`,
    });
  } catch (error) {
    console.error("Error removing mod:", error);
    return NextResponse.json(
      { error: "Failed to remove mod" },
      { status: 500 }
    );
  }
}
