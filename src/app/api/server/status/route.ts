import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getContainerStatus,
  getContainerStats,
  formatUptime,
  formatBytes,
} from "@/lib/docker";
import { rcon } from "@/lib/rcon";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const containerStatus = await getContainerStatus();

    let players = { online: 0, max: 20, players: [] as string[] };
    let stats = {
      memoryUsage: 0,
      memoryLimit: 0,
      memoryPercent: 0,
      cpuPercent: 0,
    };

    if (containerStatus.running) {
      try {
        stats = await getContainerStats();
      } catch (e) {
        console.error("Failed to get container stats:", e);
      }

      try {
        players = await rcon.listPlayers();
      } catch (e) {
        console.error("Failed to get players via RCON:", e);
      }
    }

    return NextResponse.json({
      online: containerStatus.running,
      status: containerStatus.status,
      uptime: formatUptime(containerStatus.startedAt),
      players: {
        online: players.online,
        max: players.max,
        list: players.players,
      },
      memory: {
        used: stats.memoryUsage,
        total: stats.memoryLimit,
        percent: Math.round(stats.memoryPercent * 100) / 100,
        usedFormatted: formatBytes(stats.memoryUsage),
        totalFormatted: formatBytes(stats.memoryLimit),
      },
      cpu: {
        percent: Math.round(stats.cpuPercent * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error getting server status:", error);
    return NextResponse.json(
      { error: "Failed to get server status" },
      { status: 500 }
    );
  }
}
