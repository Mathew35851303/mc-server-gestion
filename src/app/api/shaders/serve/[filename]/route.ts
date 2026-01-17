import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const SHADERPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "shaderpacks");

// GET - Serve a shader file for download
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
    const filePath = path.join(SHADERPACKS_DIR, sanitizedFilename);

    // Security check - ensure we're still in SHADERPACKS_DIR
    if (!filePath.startsWith(SHADERPACKS_DIR)) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new Response(JSON.stringify({ error: "Shader not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if it's a .zip file
    if (!sanitizedFilename.endsWith(".zip")) {
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
        "Content-Type": "application/zip",
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Last-Modified": stats.mtime.toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error serving shader file:", error);
    return new Response(JSON.stringify({ error: "Failed to serve file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
