"use client";

import { useServerStatus } from "@/hooks/use-server-status";
import { ServerStatusCard } from "@/components/server-status-card";
import { PlayerCountCard } from "@/components/player-count-card";
import { MemoryUsageCard } from "@/components/memory-usage-card";
import { CpuUsageCard } from "@/components/cpu-usage-card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Square, RotateCw, Newspaper, HardDrive, FolderOpen, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toaster";

export default function DashboardPage() {
  const { status, loading, refetch } = useServerStatus(5000);
  const [controlLoading, setControlLoading] = useState<string | null>(null);
  const toast = useToast();

  const actionLabels = {
    start: "Démarrage",
    stop: "Arrêt",
    restart: "Redémarrage",
  };

  async function handleControl(action: "start" | "stop" | "restart") {
    setControlLoading(action);
    try {
      const response = await fetch("/api/server/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Failed to control server");
      }

      toast.success(`${actionLabels[action]} du serveur en cours...`);

      // Wait a moment then refresh status
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (error) {
      console.error("Control error:", error);
      toast.error(`Erreur lors du ${actionLabels[action].toLowerCase()}`);
    } finally {
      setControlLoading(null);
    }
  }

  if (loading && !status) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de votre serveur Minecraft
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ServerStatusCard
          online={status?.online ?? false}
          status={status?.status ?? "unknown"}
          uptime={status?.uptime ?? "N/A"}
        />
        <PlayerCountCard
          online={status?.players.online ?? 0}
          max={status?.players.max ?? 20}
          players={status?.players.list ?? []}
        />
        <MemoryUsageCard
          used={status?.memory.usedFormatted ?? "0 B"}
          total={status?.memory.totalFormatted ?? "0 B"}
          percent={status?.memory.percent ?? 0}
        />
        <CpuUsageCard percent={status?.cpu.percent ?? 0} />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          {!status?.online ? (
            <Button
              onClick={() => handleControl("start")}
              disabled={controlLoading !== null}
              className="gap-2"
            >
              {controlLoading === "start" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Démarrer
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={() => handleControl("stop")}
                disabled={controlLoading !== null}
                className="gap-2"
              >
                {controlLoading === "stop" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Arrêter
              </Button>
              <Button
                onClick={() => handleControl("restart")}
                disabled={controlLoading !== null}
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {controlLoading === "restart" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                Redémarrer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Online Players */}
      {status?.online && status.players.list.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Joueurs en ligne</h2>
          <div className="flex flex-wrap gap-2">
            {status.players.list.map((player) => (
              <div
                key={player}
                className="rounded-md bg-secondary px-3 py-1.5 text-sm"
              >
                {player}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Raccourcis</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* News Card */}
          <a
            href="https://news.losnachoschipies.fr/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 transition-all hover:border-orange-500 hover:bg-orange-500/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20">
              <Newspaper className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-orange-500">News</h3>
              <p className="text-sm text-muted-foreground">Actualités du serveur</p>
            </div>
            <ExternalLink className="h-4 w-4 text-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>

          {/* Storage Card */}
          <a
            href="https://storage.losnachoschipies.fr/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 transition-all hover:border-purple-500 hover:bg-purple-500/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
              <HardDrive className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-purple-500">Storage</h3>
              <p className="text-sm text-muted-foreground">Mods client</p>
            </div>
            <ExternalLink className="h-4 w-4 text-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>

          {/* Files Card */}
          <a
            href="https://files.losnachoschipies.fr/files/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 transition-all hover:border-blue-500 hover:bg-blue-500/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <FolderOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-500">Files</h3>
              <p className="text-sm text-muted-foreground">Fichiers du serveur</p>
            </div>
            <ExternalLink className="h-4 w-4 text-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </div>
  );
}
