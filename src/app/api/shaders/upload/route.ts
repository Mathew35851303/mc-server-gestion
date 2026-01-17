import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const SHADERPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "shaderpacks");

// POST - Upload a shader file
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

    // Ensure shaderpacks directory exists
    if (!existsSync(SHADERPACKS_DIR)) {
      mkdirSync(SHADERPACKS_DIR, { recursive: true });
    }

    const filePath = path.join(SHADERPACKS_DIR, sanitizedFilename);

    // Check if file already exists
    if (existsSync(filePath)) {
      return NextResponse.json(
        { error: "A shader with this name already exists" },
        { status: 409 }
      );
    }

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      filename: sanitizedFilename,
      size: file.size,
    });
  } catch (error) {
    console.error("Error uploading shader:", error);
    return NextResponse.json(
      { error: "Failed to upload shader" },
      { status: 500 }
    );
  }
}
