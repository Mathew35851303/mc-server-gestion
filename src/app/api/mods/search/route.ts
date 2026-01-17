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
  categories: string[];
}

interface ModrinthSearchResult {
  hits: ModrinthProject[];
  total_hits: number;
  offset: number;
  limit: number;
}

// GET - Search mods on Modrinth
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
  const loader = searchParams.get("loader") || "forge";

  try {
    // Build facets for filtering mods
    const facets = JSON.stringify([
      ["project_type:mod"],
      [`versions:${gameVersion}`],
      [`categories:${loader}`],
    ]);

    const url = new URL(`${MODRINTH_API}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("facets", facets);
    url.searchParams.set("offset", offset);
    url.searchParams.set("limit", limit);
    url.searchParams.set("index", "downloads");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Modrinth API error: ${response.status}`);
    }

    const data: ModrinthSearchResult = await response.json();

    const mods = data.hits.map((hit) => ({
      id: hit.slug,
      name: hit.title,
      description: hit.description,
      icon: hit.icon_url,
      downloads: hit.downloads,
      categories: hit.categories,
    }));

    return NextResponse.json({
      mods,
      total: data.total_hits,
      offset: data.offset,
      limit: data.limit,
    });
  } catch (error) {
    console.error("Error searching mods:", error);
    return NextResponse.json(
      { error: "Failed to search mods" },
      { status: 500 }
    );
  }
}
