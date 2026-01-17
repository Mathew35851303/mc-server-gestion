"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import {
  getMatchingCommands,
  needsPlayerSuggestion,
  MinecraftCommand,
} from "@/lib/minecraft-commands";

interface ConsoleInputProps {
  onSend: (command: string) => void;
  disabled?: boolean;
  onlinePlayers?: string[];
}

export function ConsoleInput({ onSend, disabled, onlinePlayers = [] }: ConsoleInputProps) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<MinecraftCommand[]>([]);
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update suggestions when command changes
  useEffect(() => {
    const trimmed = command.trim();

    // Check if we need player suggestions
    if (needsPlayerSuggestion(trimmed) && onlinePlayers.length > 0) {
      const parts = trimmed.split(/\s+/);
      const playerPrefix = parts[1].toLowerCase();
      const matches = onlinePlayers.filter((p) =>
        p.toLowerCase().startsWith(playerPrefix)
      );
      setPlayerSuggestions(matches.slice(0, 6));
      setSuggestions([]);
      setShowSuggestions(matches.length > 0);
      setSelectedIndex(0);
      return;
    }

    // Command suggestions
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) {
      const matches = getMatchingCommands(trimmed);
      setSuggestions(matches);
      setPlayerSuggestions([]);
      setShowSuggestions(matches.length > 0 && trimmed.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setPlayerSuggestions([]);
      setShowSuggestions(false);
    }
  }, [command, onlinePlayers]);

  const handleSubmit = () => {
    if (!command.trim() || disabled) return;

    onSend(command.trim());
    setHistory((prev) => [command.trim(), ...prev].slice(0, 50));
    setCommand("");
    setHistoryIndex(-1);
    setShowSuggestions(false);
  };

  const applySuggestion = (value: string) => {
    if (playerSuggestions.length > 0) {
      // Replace player name
      const parts = command.trim().split(/\s+/);
      parts[1] = value;
      setCommand(parts.join(" ") + " ");
    } else {
      // Replace command
      setCommand(value + " ");
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const totalSuggestions = suggestions.length + playerSuggestions.length;

    if (showSuggestions && totalSuggestions > 0) {
      if (e.key === "Tab" || (e.key === "Enter" && totalSuggestions > 0 && selectedIndex >= 0)) {
        e.preventDefault();
        if (playerSuggestions.length > 0) {
          applySuggestion(playerSuggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          applySuggestion(suggestions[selectedIndex].name);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalSuggestions);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalSuggestions) % totalSuggestions);
        return;
      }

      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !showSuggestions) {
      handleSubmit();
    } else if (e.key === "ArrowUp" && !showSuggestions) {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      }
    } else if (e.key === "ArrowDown" && !showSuggestions) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand("");
      }
    }
  };

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          /
        </span>
        <Input
          ref={inputRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => {
            if (command.trim() && (suggestions.length > 0 || playerSuggestions.length > 0)) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Entrez une commande..."
          disabled={disabled}
          className="pl-6 font-mono"
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && (suggestions.length > 0 || playerSuggestions.length > 0) && (
          <div
            ref={suggestionsRef}
            className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {/* Command suggestions */}
            {suggestions.map((cmd, index) => (
              <button
                key={cmd.name}
                className={`w-full px-3 py-2 text-left hover:bg-accent flex items-start gap-3 ${
                  index === selectedIndex ? "bg-accent" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(cmd.name);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="font-mono text-sm font-medium text-primary">
                  /{cmd.name}
                </span>
                <span className="text-xs text-muted-foreground flex-1">
                  {cmd.description}
                </span>
                {cmd.args && (
                  <span className="text-xs text-muted-foreground/60 font-mono">
                    {cmd.args}
                  </span>
                )}
              </button>
            ))}

            {/* Player suggestions */}
            {playerSuggestions.map((player, index) => (
              <button
                key={player}
                className={`w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 ${
                  index === selectedIndex ? "bg-accent" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(player);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="font-mono text-sm font-medium">{player}</span>
                <span className="text-xs text-muted-foreground">Joueur en ligne</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={disabled || !command.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
