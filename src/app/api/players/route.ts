import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rcon } from "@/lib/rcon";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const players = await rcon.listPlayers();

    return NextResponse.json({
      online: players.online,
      max: players.max,
      players: players.players,
    });
  } catch (error) {
    console.error("Error getting players:", error);
    return NextResponse.json(
      { error: "Failed to get players. Is the server running?" },
      { status: 500 }
    );
  }
}
