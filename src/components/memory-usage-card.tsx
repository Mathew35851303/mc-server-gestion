"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

interface MemoryUsageCardProps {
  used: string;
  total: string;
  percent: number;
}

export function MemoryUsageCard({ used, total, percent }: MemoryUsageCardProps) {
  const getColorClass = (percent: number) => {
    if (percent < 50) return "bg-primary";
    if (percent < 80) return "bg-yellow-500";
    return "bg-destructive";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Mémoire</CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{percent.toFixed(1)}%</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {used} / {total}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full transition-all ${getColorClass(percent)}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
