import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rcon } from "@/lib/rcon";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { z } from "zod";

const WHITELIST_PATH =
  process.env.MC_WHITELIST_PATH || "/minecraft-data/whitelist.json";

interface WhitelistEntry {
  uuid: string;
  name: string;
}

// GET - List all whitelisted players
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try to read from whitelist.json file first
    if (existsSync(WHITELIST_PATH)) {
      const content = await readFile(WHITELIST_PATH, "utf-8");
      const players: WhitelistEntry[] = JSON.parse(content);
      return NextResponse.json({ players });
    }

    // Fallback to RCON if file not accessible
    const response = await rcon.whitelistList();
    // Parse response like "There are X whitelisted players: player1, player2"
    const match = response.match(/whitelisted players?:?\s*(.*)/i);
    if (match && match[1]) {
      const names = match[1].split(",").map((n) => n.trim()).filter(Boolean);
      const players = names.map((name) => ({ uuid: "", name }));
      return NextResponse.json({ players });
    }

    return NextResponse.json({ players: [] });
  } catch (error) {
    console.error("Error getting whitelist:", error);
    return NextResponse.json(
      { error: "Failed to get whitelist" },
      { status: 500 }
    );
  }
}

const addPlayerSchema = z.object({
  player: z.string().min(3).max(16).regex(/^[a-zA-Z0-9_]+$/),
});

// POST - Add player to whitelist
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { player } = addPlayerSchema.parse(body);

    const response = await rcon.whitelistAdd(player);

    // Reload whitelist to apply changes
    await rcon.whitelistReload();

    return NextResponse.json({
      success: true,
      message: response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid player name", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error adding to whitelist:", error);
    return NextResponse.json(
      { error: "Failed to add player to whitelist" },
      { status: 500 }
    );
  }
}

const removePlayerSchema = z.object({
  player: z.string().min(3).max(16),
});

// DELETE - Remove player from whitelist
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { player } = removePlayerSchema.parse(body);

    const response = await rcon.whitelistRemove(player);

    // Reload whitelist to apply changes
    await rcon.whitelistReload();

    return NextResponse.json({
      success: true,
      message: response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid player name", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error removing from whitelist:", error);
    return NextResponse.json(
      { error: "Failed to remove player from whitelist" },
      { status: 500 }
    );
  }
}
