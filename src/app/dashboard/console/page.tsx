"use client";

import { useState, useEffect, useCallback } from "react";
import { ConsoleOutput } from "@/components/console-output";
import { ConsoleInput } from "@/components/console-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Pause, Play, Trash2 } from "lucide-react";
import { useServerStatus } from "@/hooks/use-server-status";

export default function ConsolePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(true);
  const [commandResponse, setCommandResponse] = useState<string | null>(null);
  const { status } = useServerStatus(10000);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/console/logs?tail=200");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Streaming logs
  useEffect(() => {
    if (!streaming || !status?.online) return;

    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource("/api/console/stream");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.log) {
            setLogs((prev) => [...prev.slice(-499), data.log]);
          }
        } catch (e) {
          console.error("Failed to parse log:", e);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Retry after delay
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [streaming, status?.online]);

  const handleCommand = async (command: string) => {
    setCommandResponse(null);
    try {
      const response = await fetch("/api/server/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();

      if (response.ok) {
        setCommandResponse(data.response);
        // Add command to local logs
        setLogs((prev) => [...prev, `> ${command}`, data.response]);
      } else {
        setCommandResponse(`Erreur: ${data.error}`);
      }
    } catch (error) {
      setCommandResponse("Erreur de connexion au serveur");
      console.error("Command error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Console</h1>
          <p className="text-muted-foreground">
            Logs du serveur et exécution de commandes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status?.online ? "default" : "secondary"}>
            {status?.online ? "Serveur en ligne" : "Serveur hors ligne"}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStreaming(!streaming)}
          className="gap-2"
        >
          {streaming ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Reprendre
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLogs([])}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" /> Effacer
        </Button>
      </div>

      {/* Console Output */}
      {loading ? (
        <div className="flex h-[500px] items-center justify-center rounded-md border bg-zinc-950">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ConsoleOutput logs={logs} autoScroll={streaming} />
      )}

      {/* Command Response */}
      {commandResponse && (
        <div className="rounded-md border bg-secondary/50 p-3 font-mono text-sm">
          <span className="text-muted-foreground">Réponse: </span>
          {commandResponse}
        </div>
      )}

      {/* Command Input */}
      <ConsoleInput onSend={handleCommand} disabled={!status?.online} />

      {!status?.online && (
        <p className="text-sm text-muted-foreground">
          Le serveur doit être en ligne pour envoyer des commandes.
        </p>
      )}
    </div>
  );
}
