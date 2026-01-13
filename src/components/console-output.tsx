"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConsoleOutputProps {
  logs: string[];
  autoScroll?: boolean;
}

export function ConsoleOutput({ logs, autoScroll = true }: ConsoleOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Parse ANSI colors and timestamps from log lines
  const formatLine = (line: string) => {
    // Remove Docker timestamp prefix if present
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s*(.*)/);
    let timestamp = "";
    let content = line;

    if (timestampMatch) {
      const date = new Date(timestampMatch[1]);
      timestamp = date.toLocaleTimeString("fr-FR");
      content = timestampMatch[2];
    }

    // Simple ANSI color removal (basic implementation)
    content = content.replace(/\x1b\[[0-9;]*m/g, "");

    // Colorize based on content
    let colorClass = "text-foreground";
    if (content.includes("[ERROR]") || content.includes("ERROR")) {
      colorClass = "text-red-400";
    } else if (content.includes("[WARN]") || content.includes("WARN")) {
      colorClass = "text-yellow-400";
    } else if (content.includes("[INFO]")) {
      colorClass = "text-muted-foreground";
    } else if (content.includes("joined the game")) {
      colorClass = "text-green-400";
    } else if (content.includes("left the game")) {
      colorClass = "text-orange-400";
    }

    return { timestamp, content, colorClass };
  };

  return (
    <ScrollArea className="h-[500px] rounded-md border bg-zinc-950 p-4 font-mono text-sm">
      <div className="space-y-1">
        {logs.map((line, index) => {
          const { timestamp, content, colorClass } = formatLine(line);
          return (
            <div key={index} className="flex gap-2">
              {timestamp && (
                <span className="text-zinc-500 shrink-0">[{timestamp}]</span>
              )}
              <span className={colorClass}>{content}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {logs.length === 0 && (
        <div className="text-zinc-500">En attente de logs...</div>
      )}
    </ScrollArea>
  );
}
