"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface PlayerCountCardProps {
  online: number;
  max: number;
  players: string[];
}

export function PlayerCountCard({ online, max, players }: PlayerCountCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Joueurs</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {online} <span className="text-lg font-normal text-muted-foreground">/ {max}</span>
        </div>
        {players.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {players.slice(0, 5).join(", ")}
            {players.length > 5 && ` +${players.length - 5} autres`}
          </div>
        )}
        {players.length === 0 && online === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Aucun joueur connecté
          </p>
        )}
      </CardContent>
    </Card>
  );
}
