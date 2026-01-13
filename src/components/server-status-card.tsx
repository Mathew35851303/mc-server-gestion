"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";

interface ServerStatusCardProps {
  online: boolean;
  status: string;
  uptime: string;
}

export function ServerStatusCard({
  online,
  status,
  uptime,
}: ServerStatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Status Serveur</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant={online ? "default" : "destructive"}>
            {online ? "En ligne" : "Hors ligne"}
          </Badge>
          <span className="text-sm text-muted-foreground capitalize">
            {status}
          </span>
        </div>
        {online && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Uptime: {uptime}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
