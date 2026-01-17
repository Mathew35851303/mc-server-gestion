import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const MODS_DIR = path.join(MINECRAFT_DATA_PATH, "mods");

// GET - Serve a mod file for download
// This endpoint is PUBLIC (no auth required) for launcher access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(decodedFilename);
    const filePath = path.join(MODS_DIR, sanitizedFilename);

    // Security check - ensure we're still in MODS_DIR
    if (!filePath.startsWith(MODS_DIR)) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new Response(JSON.stringify({ error: "Mod not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if it's a .jar file
    if (!sanitizedFilename.endsWith(".jar")) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get file stats
    const stats = await stat(filePath);

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Return the file with appropriate headers
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/java-archive",
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Last-Modified": stats.mtime.toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error serving mod file:", error);
    return new Response(JSON.stringify({ error: "Failed to serve file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
