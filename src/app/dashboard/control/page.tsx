"use client";

import { useState } from "react";
import { useServerStatus } from "@/hooks/use-server-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  RotateCw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function ControlPage() {
  const { status, loading, refetch } = useServerStatus(3000);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleAction(action: "start" | "stop" | "restart") {
    setActionLoading(action);
    setMessage(null);

    try {
      const response = await fetch("/api/server/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        // Refresh status after a delay
        setTimeout(refetch, 2000);
        setTimeout(refetch, 5000);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion" });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contrôle du serveur</h1>
          <p className="text-muted-foreground">
            Démarrer, arrêter ou redémarrer le serveur Minecraft
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={refetch}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status actuel
            {status?.online ? (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                En ligne
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Hors ligne
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {status?.online
              ? `Le serveur est en cours d'exécution depuis ${status.uptime}`
              : "Le serveur est actuellement arrêté"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{status?.status || "unknown"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joueurs</p>
              <p className="font-medium">
                {status?.players.online || 0} / {status?.players.max || 20}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mémoire</p>
              <p className="font-medium">
                {status?.memory.usedFormatted || "N/A"} /{" "}
                {status?.memory.totalFormatted || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-4 ${
            message.type === "success"
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Control Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Start */}
        <Card className={status?.online ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="h-5 w-5 text-primary" />
              Démarrer
            </CardTitle>
            <CardDescription>
              Lancer le serveur Minecraft
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gap-2"
              disabled={status?.online || actionLoading !== null}
              onClick={() => handleAction("start")}
            >
              {actionLoading === "start" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Démarrer le serveur
            </Button>
          </CardContent>
        </Card>

        {/* Stop */}
        <Card className={!status?.online ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Square className="h-5 w-5 text-destructive" />
              Arrêter
            </CardTitle>
            <CardDescription>
              Arrêter proprement le serveur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full gap-2"
              disabled={!status?.online || actionLoading !== null}
              onClick={() => handleAction("stop")}
            >
              {actionLoading === "stop" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Arrêter le serveur
            </Button>
          </CardContent>
        </Card>

        {/* Restart */}
        <Card className={!status?.online ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCw className="h-5 w-5 text-yellow-500" />
              Redémarrer
            </CardTitle>
            <CardDescription>
              Redémarrer le serveur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full gap-2"
              disabled={!status?.online || actionLoading !== null}
              onClick={() => handleAction("restart")}
            >
              {actionLoading === "restart" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Redémarrer le serveur
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500">Information</p>
          <p className="text-muted-foreground">
            Arrêter ou redémarrer le serveur déconnectera tous les joueurs en
            ligne. Assurez-vous de les prévenir avant toute action.
          </p>
        </div>
      </div>
    </div>
  );
}
