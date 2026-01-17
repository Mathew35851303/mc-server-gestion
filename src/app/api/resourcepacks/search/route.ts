import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MODRINTH_API = "https://api.modrinth.com/v2";

interface ModrinthProject {
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  downloads: number;
  project_type: string;
  versions: string[];
}

interface ModrinthSearchResult {
  hits: ModrinthProject[];
  total_hits: number;
  offset: number;
  limit: number;
}

// GET - Search resource packs on Modrinth
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const offset = searchParams.get("offset") || "0";
  const limit = searchParams.get("limit") || "20";
  const gameVersion = searchParams.get("version") || "1.20.1";

  try {
    // Build facets for filtering
    const facets = JSON.stringify([
      ["project_type:resourcepack"],
      [`versions:${gameVersion}`],
    ]);

    const url = new URL(`${MODRINTH_API}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("facets", facets);
    url.searchParams.set("offset", offset);
    url.searchParams.set("limit", limit);
    url.searchParams.set("index", "downloads"); // Sort by downloads

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Modrinth API error: ${response.status}`);
    }

    const data: ModrinthSearchResult = await response.json();

    // Transform to simpler format
    const packs = data.hits.map((hit) => ({
      id: hit.slug,
      name: hit.title,
      description: hit.description,
      icon: hit.icon_url,
      downloads: hit.downloads,
      versions: hit.versions,
    }));

    return NextResponse.json({
      packs,
      total: data.total_hits,
      offset: data.offset,
      limit: data.limit,
    });
  } catch (error) {
    console.error("Error searching resource packs:", error);
    return NextResponse.json(
      { error: "Failed to search resource packs" },
      { status: 500 }
    );
  }
}
