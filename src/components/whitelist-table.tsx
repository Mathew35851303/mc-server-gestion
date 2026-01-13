"use client";

import { useState } from "react";
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
import { Trash2, UserPlus, Search } from "lucide-react";

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
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newPlayer.trim()) return;
    setActionLoading(true);
    try {
      await onAdd(newPlayer.trim());
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
      await onRemove(playerToRemove);
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
            <Input
              placeholder="Nom du joueur"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleAdd} disabled={actionLoading || !newPlayer.trim()}>
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
                <tr key={player.uuid || player.name} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{player.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {player.uuid || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setPlayerToRemove(player.name);
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
              Êtes-vous sûr de vouloir retirer <strong>{playerToRemove}</strong>{" "}
              de la whitelist ?
            </DialogDescription>
          </DialogHeader>
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
