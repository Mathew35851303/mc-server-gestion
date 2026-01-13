"use client";

import { useState, useEffect, useCallback } from "react";
import { WhitelistTable } from "@/components/whitelist-table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Player {
  uuid: string;
  name: string;
}

export default function WhitelistPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWhitelist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/whitelist");
      if (!response.ok) {
        throw new Error("Failed to fetch whitelist");
      }
      const data = await response.json();
      setPlayers(data.players);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWhitelist();
  }, [fetchWhitelist]);

  const handleAdd = async (name: string) => {
    const response = await fetch("/api/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: name }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to add player");
    }

    // Refresh the list
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
      throw new Error(data.error || "Failed to remove player");
    }

    // Refresh the list
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
        <Button variant="outline" size="icon" onClick={fetchWhitelist}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
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
