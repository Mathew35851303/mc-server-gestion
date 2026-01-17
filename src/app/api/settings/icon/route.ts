import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const ICON_PATH = path.join(MINECRAFT_DATA_PATH, "server-icon.png");

// GET - Get current server icon
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (existsSync(ICON_PATH)) {
      const iconBuffer = await readFile(ICON_PATH);
      const base64 = iconBuffer.toString("base64");
      return NextResponse.json({
        exists: true,
        icon: `data:image/png;base64,${base64}`,
      });
    }

    return NextResponse.json({ exists: false, icon: null });
  } catch (error) {
    console.error("Error reading server icon:", error);
    return NextResponse.json(
      { error: "Failed to read server icon" },
      { status: 500 }
    );
  }
}

// POST - Upload new server icon
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("icon") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check PNG signature
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!buffer.subarray(0, 8).equals(pngSignature)) {
      return NextResponse.json(
        { error: "File must be a PNG image" },
        { status: 400 }
      );
    }

    // Read PNG dimensions from IHDR chunk
    // IHDR is always the first chunk after signature
    // Chunk structure: length (4 bytes) + type (4 bytes) + data + CRC (4 bytes)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    if (width !== 64 || height !== 64) {
      return NextResponse.json(
        {
          error: `Image must be 64x64 pixels. Current: ${width}x${height}`,
          width,
          height,
        },
        { status: 400 }
      );
    }

    // Write the icon file
    await writeFile(ICON_PATH, buffer);

    // Return the new icon as base64
    const base64 = buffer.toString("base64");

    return NextResponse.json({
      success: true,
      message: "Icon uploaded successfully. Restart the server to apply.",
      icon: `data:image/png;base64,${base64}`,
    });
  } catch (error) {
    console.error("Error uploading server icon:", error);
    return NextResponse.json(
      { error: "Failed to upload server icon" },
      { status: 500 }
    );
  }
}

// DELETE - Remove server icon
export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (existsSync(ICON_PATH)) {
      await unlink(ICON_PATH);
      return NextResponse.json({
        success: true,
        message: "Icon removed successfully",
      });
    }

    return NextResponse.json({ success: true, message: "No icon to remove" });
  } catch (error) {
    console.error("Error removing server icon:", error);
    return NextResponse.json(
      { error: "Failed to remove server icon" },
      { status: 500 }
    );
  }
}
