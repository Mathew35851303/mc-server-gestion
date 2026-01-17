"use client";

import { useState } from "react";
import { User } from "lucide-react";

interface PlayerAvatarProps {
  uuid?: string;
  username?: string;
  size?: number;
  className?: string;
}

export function PlayerAvatar({
  uuid,
  username,
  size = 32,
  className = "",
}: PlayerAvatarProps) {
  const [error, setError] = useState(false);

  // Use mc-heads.net API - works with username directly, no CORS issues
  // Priority: username > uuid (mc-heads works better with usernames)
  const avatarUrl = username
    ? `https://mc-heads.net/avatar/${username}/${size}`
    : uuid
    ? `https://mc-heads.net/avatar/${uuid}/${size}`
    : null;

  if (!avatarUrl || error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={username || "Player"}
      width={size}
      height={size}
      className={`rounded ${className}`}
      onError={() => setError(true)}
    />
  );
}

// Component to fetch UUID from username and display avatar
interface PlayerAvatarByNameProps {
  username: string;
  size?: number;
  className?: string;
  onUuidFetched?: (uuid: string | null) => void;
}

export function PlayerAvatarByName({
  username,
  size = 32,
  className = "",
  onUuidFetched,
}: PlayerAvatarByNameProps) {
  const [uuid, setUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fetch UUID when username changes
  useState(() => {
    if (!username || username.length < 3) {
      setUuid(null);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Use Mojang API to get UUID from username
    fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error("Player not found");
        return res.json();
      })
      .then((data) => {
        const formattedUuid = formatUuid(data.id);
        setUuid(formattedUuid);
        onUuidFetched?.(formattedUuid);
      })
      .catch(() => {
        setUuid(null);
        setError(true);
        onUuidFetched?.(null);
      })
      .finally(() => setLoading(false));
  });

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (error || !uuid) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return <PlayerAvatar uuid={uuid} username={username} size={size} className={className} />;
}

// Format UUID from Mojang API (no dashes) to standard format (with dashes)
function formatUuid(uuid: string): string {
  if (uuid.includes("-")) return uuid;
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
}
