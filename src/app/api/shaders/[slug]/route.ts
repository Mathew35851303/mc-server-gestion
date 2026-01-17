import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MODRINTH_API = "https://api.modrinth.com/v2";

interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: {
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    hashes: {
      sha1: string;
      sha512: string;
    };
  }[];
}

// GET - Get shader details and download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    // Get project details
    const projectRes = await fetch(`${MODRINTH_API}/project/${slug}`, {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });

    if (!projectRes.ok) {
      return NextResponse.json({ error: "Shader not found" }, { status: 404 });
    }

    const project = await projectRes.json();

    // Get all versions for this shader
    const versionsRes = await fetch(`${MODRINTH_API}/project/${slug}/version`, {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });

    if (!versionsRes.ok) {
      throw new Error("Failed to fetch versions");
    }

    const versions: ModrinthVersion[] = await versionsRes.json();
    const latestVersion = versions[0];

    if (!latestVersion) {
      return NextResponse.json(
        { error: "No version found for this shader" },
        { status: 404 }
      );
    }

    const primaryFile =
      latestVersion.files.find((f) => f.primary) || latestVersion.files[0];

    return NextResponse.json({
      id: project.slug,
      name: project.title,
      description: project.description,
      icon: project.icon_url,
      downloads: project.downloads,
      categories: project.categories,
      version: {
        id: latestVersion.id,
        name: latestVersion.name,
        number: latestVersion.version_number,
        gameVersions: latestVersion.game_versions,
        loaders: latestVersion.loaders,
      },
      file: {
        url: primaryFile.url,
        filename: primaryFile.filename,
        size: primaryFile.size,
        sha1: primaryFile.hashes.sha1,
      },
    });
  } catch (error) {
    console.error("Error fetching shader:", error);
    return NextResponse.json(
      { error: "Failed to fetch shader details" },
      { status: 500 }
    );
  }
}
