import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MODRINTH_API = "https://api.modrinth.com/v2";

// GET - Search for shaders on Modrinth
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = searchParams.get("limit") || "20";

  try {
    // Shaders are project_type:shader
    const facets = JSON.stringify([["project_type:shader"]]);

    const url = `${MODRINTH_API}/search?query=${encodeURIComponent(query)}&limit=${limit}&facets=${encodeURIComponent(facets)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "mc-admin-panel/1.0.0 (contact@example.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Modrinth API error: ${response.status}`);
    }

    const data = await response.json();

    const shaders = data.hits.map(
      (hit: {
        slug: string;
        title: string;
        description: string;
        icon_url: string | null;
        downloads: number;
        categories: string[];
      }) => ({
        id: hit.slug,
        name: hit.title,
        description: hit.description,
        icon: hit.icon_url,
        downloads: hit.downloads,
        categories: hit.categories,
      })
    );

    return NextResponse.json({ shaders, total: data.total_hits });
  } catch (error) {
    console.error("Error searching shaders:", error);
    return NextResponse.json(
      { error: "Failed to search shaders" },
      { status: 500 }
    );
  }
}
