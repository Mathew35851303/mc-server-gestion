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
  dependencies: {
    project_id: string;
    dependency_type: "required" | "optional" | "incompatible" | "embedded";
  }[];
}

// GET - Get mod details and download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const gameVersion = searchParams.get("version") || "1.20.1";
  const loader = searchParams.get("loader") || "forge";

  try {
    // Get project details
    const projectRes = await fetch(`${MODRINTH_API}/project/${slug}`, {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });

    if (!projectRes.ok) {
      return NextResponse.json({ error: "Mod not found" }, { status: 404 });
    }

    const project = await projectRes.json();

    // Get versions for this project
    const versionsRes = await fetch(
      `${MODRINTH_API}/project/${slug}/version?game_versions=["${gameVersion}"]&loaders=["${loader}"]`,
      {
        headers: {
          "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
        },
      }
    );

    if (!versionsRes.ok) {
      throw new Error("Failed to fetch versions");
    }

    const versions: ModrinthVersion[] = await versionsRes.json();
    const latestVersion = versions[0];

    if (!latestVersion) {
      return NextResponse.json(
        { error: "No compatible version found for this loader/game version" },
        { status: 404 }
      );
    }

    const primaryFile =
      latestVersion.files.find((f) => f.primary) || latestVersion.files[0];

    // Get required dependencies
    const requiredDeps = latestVersion.dependencies.filter(
      (d) => d.dependency_type === "required"
    );

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
      dependencies: requiredDeps.map((d) => d.project_id),
    });
  } catch (error) {
    console.error("Error fetching mod:", error);
    return NextResponse.json(
      { error: "Failed to fetch mod details" },
      { status: 500 }
    );
  }
}
