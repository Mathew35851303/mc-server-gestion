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

interface ModrinthProject {
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  categories: string[];
}

interface DependencyInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  file: {
    url: string;
    filename: string;
    size: number;
    sha1: string;
  };
  version: {
    id: string;
    name: string;
    number: string;
  };
}

async function fetchProjectDetails(projectId: string): Promise<ModrinthProject | null> {
  try {
    const res = await fetch(`${MODRINTH_API}/project/${projectId}`, {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchProjectVersion(
  projectId: string,
  gameVersion: string,
  loader: string
): Promise<ModrinthVersion | null> {
  try {
    const res = await fetch(
      `${MODRINTH_API}/project/${projectId}/version?game_versions=["${gameVersion}"]&loaders=["${loader}"]`,
      {
        headers: {
          "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
        },
      }
    );
    if (!res.ok) return null;
    const versions: ModrinthVersion[] = await res.json();
    return versions[0] || null;
  } catch {
    return null;
  }
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

    // Get required dependencies with full details
    const requiredDeps = latestVersion.dependencies.filter(
      (d) => d.dependency_type === "required"
    );

    const dependenciesWithDetails: DependencyInfo[] = [];

    // Fetch details for each dependency in parallel
    if (requiredDeps.length > 0) {
      const depPromises = requiredDeps.map(async (dep) => {
        const [depProject, depVersion] = await Promise.all([
          fetchProjectDetails(dep.project_id),
          fetchProjectVersion(dep.project_id, gameVersion, loader),
        ]);

        if (depProject && depVersion) {
          const depFile =
            depVersion.files.find((f) => f.primary) || depVersion.files[0];

          if (depFile) {
            return {
              id: depProject.slug,
              name: depProject.title,
              description: depProject.description,
              icon: depProject.icon_url,
              file: {
                url: depFile.url,
                filename: depFile.filename,
                size: depFile.size,
                sha1: depFile.hashes.sha1,
              },
              version: {
                id: depVersion.id,
                name: depVersion.name,
                number: depVersion.version_number,
              },
            };
          }
        }
        return null;
      });

      const results = await Promise.all(depPromises);
      dependenciesWithDetails.push(
        ...results.filter((d): d is DependencyInfo => d !== null)
      );
    }

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
      dependencies: dependenciesWithDetails,
    });
  } catch (error) {
    console.error("Error fetching mod:", error);
    return NextResponse.json(
      { error: "Failed to fetch mod details" },
      { status: 500 }
    );
  }
}
