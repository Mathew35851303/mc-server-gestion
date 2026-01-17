"use client";

import { useState, useEffect, useCallback } from "react";
import { WhitelistTable } from "@/components/whitelist-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield, ShieldOff } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

interface Player {
  uuid: string;
  name: string;
}

export default function WhitelistPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  const fetchWhitelist = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/whitelist");
      if (!response.ok) {
        throw new Error("Failed to fetch whitelist");
      }
      const data = await response.json();
      setPlayers(data.players);
      setEnabled(data.enabled ?? false);
    } catch {
      toast.error("Erreur lors du chargement de la whitelist");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWhitelist();
  }, [fetchWhitelist]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const response = await fetch("/api/whitelist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to toggle whitelist");
      }

      const data = await response.json();
      setEnabled(data.enabled);
      toast.success(data.enabled ? "Whitelist activée" : "Whitelist désactivée");
    } catch {
      toast.error("Erreur lors de la modification de la whitelist");
    } finally {
      setToggling(false);
    }
  };

  const handleAdd = async (name: string) => {
    const response = await fetch("/api/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: name }),
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error || "Erreur lors de l'ajout du joueur");
      throw new Error(data.error || "Failed to add player");
    }

    toast.success(`${name} ajouté à la whitelist`);
    await fetchWhitelist();
  };

  const handleRemove = async (name: string) => {
    const response = await fetch("/api/whitelist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: name }),
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error || "Erreur lors de la suppression du joueur");
      throw new Error(data.error || "Failed to remove player");
    }

    toast.success(`${name} retiré de la whitelist`);
    await fetchWhitelist();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Whitelist</h1>
          <p className="text-muted-foreground">
            Gérez les joueurs autorisés à rejoindre le serveur
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Whitelist toggle */}
          <Button
            variant={enabled ? "default" : "outline"}
            onClick={handleToggle}
            disabled={toggling || loading}
            className="gap-2"
          >
            {enabled ? (
              <>
                <Shield className="h-4 w-4" />
                Whitelist activée
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4" />
                Whitelist désactivée
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchWhitelist}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {!loading && (
        <div
          className={`rounded-md p-3 text-sm flex items-center gap-2 ${
            enabled
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          }`}
        >
          {enabled ? (
            <>
              <Shield className="h-4 w-4" />
              La whitelist est activée. Seuls les joueurs de la liste peuvent rejoindre le serveur.
            </>
          ) : (
            <>
              <ShieldOff className="h-4 w-4" />
              La whitelist est désactivée. Tous les joueurs peuvent rejoindre le serveur.
            </>
          )}
        </div>
      )}

      {/* Table */}
      <WhitelistTable
        players={players}
        onAdd={handleAdd}
        onRemove={handleRemove}
        loading={loading}
      />
    </div>
  );
}
