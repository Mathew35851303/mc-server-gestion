"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, UserPlus, Search, Check, X } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";

interface Player {
  uuid: string;
  name: string;
}

interface WhitelistTableProps {
  players: Player[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
  loading?: boolean;
}

// Hook to lookup player UUID from Mojang API
function usePlayerLookup(username: string) {
  const [data, setData] = useState<{ uuid: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!username || username.length < 3) {
      setData(null);
      setError(false);
      return;
    }

    const timeout = setTimeout(() => {
      setLoading(true);
      setError(false);

      fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`)
        .then((res) => {
          if (!res.ok) throw new Error("Player not found");
          return res.json();
        })
        .then((result) => {
          const uuid = formatUuid(result.id);
          setData({ uuid, name: result.name });
        })
        .catch(() => {
          setData(null);
          setError(true);
        })
        .finally(() => setLoading(false));
    }, 500); // Debounce

    return () => clearTimeout(timeout);
  }, [username]);

  return { data, loading, error };
}

function formatUuid(uuid: string): string {
  if (uuid.includes("-")) return uuid;
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
}

export function WhitelistTable({
  players,
  onAdd,
  onRemove,
  loading,
}: WhitelistTableProps) {
  const [search, setSearch] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<Player | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const playerLookup = usePlayerLookup(newPlayer);

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    const nameToAdd = playerLookup.data?.name || newPlayer.trim();
    if (!nameToAdd) return;
    setActionLoading(true);
    try {
      await onAdd(nameToAdd);
      setNewPlayer("");
      setAddDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!playerToRemove) return;
    setActionLoading(true);
    try {
      await onRemove(playerToRemove.name);
      setPlayerToRemove(null);
      setRemoveDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Ajouter un joueur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un joueur</DialogTitle>
              <DialogDescription>
                Entrez le nom du joueur Minecraft à ajouter à la whitelist.
              </DialogDescription>
            </DialogHeader>

            {/* Player preview */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              {playerLookup.loading ? (
                <div className="w-12 h-12 bg-muted rounded animate-pulse" />
              ) : playerLookup.data ? (
                <PlayerAvatar uuid={playerLookup.data.uuid} username={playerLookup.data.name} size={48} />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <span className="text-2xl text-muted-foreground">?</span>
                </div>
              )}
              <div className="flex-1">
                <Input
                  placeholder="Nom du joueur"
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !playerLookup.loading && playerLookup.data && handleAdd()}
                />
                {playerLookup.loading && (
                  <p className="text-xs text-muted-foreground mt-1">Recherche du joueur...</p>
                )}
                {playerLookup.error && newPlayer.length >= 3 && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Joueur introuvable
                  </p>
                )}
                {playerLookup.data && (
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {playerLookup.data.name}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setNewPlayer("");
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAdd}
                disabled={actionLoading || !newPlayer.trim() || playerLookup.loading || (newPlayer.length >= 3 && playerLookup.error)}
              >
                {actionLoading ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Joueur</th>
              <th className="px-4 py-3 text-left text-sm font-medium">UUID</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Chargement...
                </td>
              </tr>
            ) : filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? "Aucun joueur trouvé" : "La whitelist est vide"}
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => (
                <tr key={player.uuid || player.name} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar uuid={player.uuid} username={player.name} size={32} />
                      <span className="font-medium">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {player.uuid || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setPlayerToRemove(player);
                        setRemoveDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Player count */}
      <p className="text-sm text-muted-foreground">
        {filteredPlayers.length} joueur{filteredPlayers.length !== 1 ? "s" : ""}{" "}
        {search && `(${players.length} total)`}
      </p>

      {/* Remove confirmation dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le joueur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer ce joueur de la whitelist ?
            </DialogDescription>
          </DialogHeader>

          {playerToRemove && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <PlayerAvatar uuid={playerToRemove.uuid} username={playerToRemove.name} size={48} />
              <div>
                <p className="font-medium">{playerToRemove.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{playerToRemove.uuid || "N/A"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={actionLoading}
            >
              {actionLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
