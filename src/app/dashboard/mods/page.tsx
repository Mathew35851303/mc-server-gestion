"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Box,
  Download,
  Check,
  Loader2,
  FolderOpen,
  AlertTriangle,
  Link2,
  Filter,
  X,
  Copy,
  ExternalLink,
  FileJson,
} from "lucide-react";
import { useToast } from "@/components/ui/toaster";

interface SearchResult {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  downloads: number;
  categories: string[];
}

interface ModDependency {
  id: string;
  name: string;
  description: string;
  icon: string;
  file: {
    url: string;
    filename: string;
    size: number;
    sha1: string;
  };
  version: {
    id: string;
    name: string;
    number: string;
  };
}

interface ModToInstall {
  id: string;
  name: string;
  icon: string | null;
  downloadUrl: string;
  filename: string;
  size: number;
  isDependency?: boolean;
  requiredBy?: string;
}

interface InstalledMod {
  filename: string;
  size: number;
}

interface ModProgress {
  modId: string;
  modName: string;
  status: "pending" | "downloading" | "complete" | "error";
  progress: number;
  downloaded?: number;
  total?: number;
  error?: string;
}

interface InstallationState {
  active: boolean;
  mods: ModProgress[];
}

interface ManifestInfo {
  version: string;
  minecraft_version: string;
  last_updated: string;
  mods: {
    filename: string;
    size: number;
    sha256: string;
    url: string;
  }[];
}

export default function ModsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [modsToInstall, setModsToInstall] = useState<ModToInstall[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMod, setAddingMod] = useState<string | null>(null);
  const [installation, setInstallation] = useState<InstallationState>({
    active: false,
    mods: [],
  });
  const [installedFilter, setInstalledFilter] = useState("");
  const [manifest, setManifest] = useState<ManifestInfo | null>(null);
  const toast = useToast();

  // Get base URL for manifest
  const getManifestUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/manifest`;
    }
    return "/api/manifest";
  };

  // Fetch manifest info
  const fetchManifest = useCallback(async () => {
    try {
      const response = await fetch("/api/manifest");
      if (response.ok) {
        const data = await response.json();
        setManifest(data);
      }
    } catch (error) {
      console.error("Failed to fetch manifest:", error);
    }
  }, []);

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié dans le presse-papier");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  // Filter installed mods
  const filteredInstalledMods = installedMods.filter((mod) =>
    mod.filename.toLowerCase().includes(installedFilter.toLowerCase())
  );

  // Fetch installed mods
  const fetchInstalledMods = useCallback(async () => {
    try {
      const response = await fetch("/api/mods");
      if (response.ok) {
        const data = await response.json();
        setInstalledMods(data.mods || []);
      }
    } catch (error) {
      console.error("Failed to fetch mods:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstalledMods();
    fetchManifest();
  }, [fetchInstalledMods, fetchManifest]);

  // Search for mods
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `/api/mods/search?q=${encodeURIComponent(searchQuery)}&loader=forge&version=1.20.1`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.mods);
      }
    } catch (error) {
      toast.error("Erreur lors de la recherche");
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  // Add mod to install list
  const handleAddMod = async (mod: SearchResult) => {
    setAddingMod(mod.id);
    try {
      const detailsRes = await fetch(`/api/mods/${mod.id}?loader=forge&version=1.20.1`);
      if (!detailsRes.ok) {
        const err = await detailsRes.json();
        throw new Error(err.error || "Failed to get mod details");
      }
      const details = await detailsRes.json();

      // Check if already in list
      if (modsToInstall.some((m) => m.id === details.id)) {
        toast.warning("Ce mod est déjà dans la liste");
        return;
      }

      // Check if already installed
      if (installedMods.some((m) => m.filename === details.file.filename)) {
        toast.warning("Ce mod est déjà installé");
        return;
      }

      const modsToAdd: ModToInstall[] = [];

      // Add the main mod
      modsToAdd.push({
        id: details.id,
        name: details.name,
        icon: details.icon,
        downloadUrl: details.file.url,
        filename: details.file.filename,
        size: details.file.size,
      });

      // Add dependencies
      const dependencies: ModDependency[] = details.dependencies || [];
      const addedDeps: string[] = [];

      for (const dep of dependencies) {
        // Check if dependency is already in list or installed
        const isInList = modsToInstall.some((m) => m.id === dep.id);
        const isInstalled = installedMods.some((m) => m.filename === dep.file.filename);

        if (!isInList && !isInstalled && !modsToAdd.some((m) => m.id === dep.id)) {
          modsToAdd.push({
            id: dep.id,
            name: dep.name,
            icon: dep.icon,
            downloadUrl: dep.file.url,
            filename: dep.file.filename,
            size: dep.file.size,
            isDependency: true,
            requiredBy: details.name,
          });
          addedDeps.push(dep.name);
        }
      }

      setModsToInstall((prev) => [...prev, ...modsToAdd]);

      if (addedDeps.length > 0) {
        toast.success(`${mod.name} + ${addedDeps.length} dépendance(s) ajoutés`);
      } else {
        toast.success(`${mod.name} ajouté à la liste`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout");
      console.error("Add error:", error);
    } finally {
      setAddingMod(null);
    }
  };

  // Remove mod from install list
  const handleRemoveFromList = (modId: string) => {
    setModsToInstall((prev) => prev.filter((m) => m.id !== modId));
  };

  // Delete installed mod
  const handleDeleteMod = async (filename: string) => {
    try {
      const response = await fetch("/api/mods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      if (response.ok) {
        toast.success(`${filename} supprimé`);
        await fetchInstalledMods();
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error("Delete error:", error);
    }
  };

  // Install mods with progress
  const handleInstall = async () => {
    if (modsToInstall.length === 0) return;

    setInstallation({
      active: true,
      mods: modsToInstall.map((m) => ({
        modId: m.id,
        modName: m.name,
        status: "pending",
        progress: 0,
      })),
    });

    try {
      const response = await fetch("/api/mods/install/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mods: modsToInstall }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start installation");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case "downloading":
              setInstallation((prev) => ({
                ...prev,
                mods: prev.mods.map((m) =>
                  m.modId === data.modId
                    ? {
                        ...m,
                        status: "downloading",
                        progress: data.progress || 0,
                        downloaded: data.downloaded,
                        total: data.total,
                      }
                    : m
                ),
              }));
              break;

            case "modComplete":
              setInstallation((prev) => ({
                ...prev,
                mods: prev.mods.map((m) =>
                  m.modId === data.modId
                    ? { ...m, status: "complete", progress: 100 }
                    : m
                ),
              }));
              break;

            case "modError":
              setInstallation((prev) => ({
                ...prev,
                mods: prev.mods.map((m) =>
                  m.modId === data.modId
                    ? { ...m, status: "error", error: data.error }
                    : m
                ),
              }));
              break;

            case "complete":
              setInstallation({ active: false, mods: [] });
              setModsToInstall([]);
              toast.success(data.message);
              await fetchInstalledMods();
              break;

            case "error":
              setInstallation({ active: false, mods: [] });
              toast.error(data.message);
              break;
          }
        }
      }
    } catch (error) {
      setInstallation({ active: false, mods: [] });
      toast.error("Erreur lors de l'installation");
      console.error("Install error:", error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isModInList = (modId: string) => modsToInstall.some((m) => m.id === modId);

  const getStatusIcon = (status: ModProgress["status"]) => {
    switch (status) {
      case "pending":
        return <Box className="h-4 w-4 text-muted-foreground" />;
      case "downloading":
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "complete":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mods</h1>
          <p className="text-muted-foreground">
            Recherchez et installez des mods Forge depuis Modrinth
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchInstalledMods}
          disabled={loading || installation.active}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Installation Progress */}
      {installation.active && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Installation en cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installation.mods.map((mod) => (
              <div key={mod.modId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(mod.status)}
                    <span className={mod.status === "complete" ? "text-muted-foreground" : ""}>
                      {mod.modName}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {mod.status === "downloading" && mod.downloaded && mod.total
                      ? `${formatBytes(mod.downloaded)} / ${formatBytes(mod.total)}`
                      : mod.status === "downloading"
                        ? `${mod.progress}%`
                        : mod.status === "complete"
                          ? "Installé"
                          : mod.status === "error"
                            ? "Erreur"
                            : "En attente"}
                  </span>
                </div>
                <Progress value={mod.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher sur Modrinth
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher un mod Forge 1.20.1..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={installation.active}
            />
            <Button onClick={handleSearch} disabled={searching || installation.active} className="gap-2">
              {searching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Rechercher
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {searchResults.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {mod.icon ? (
                    <img src={mod.icon} alt={mod.name} className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Box className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{mod.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        {formatNumber(mod.downloads)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {mod.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isModInList(mod.id) ? "secondary" : "default"}
                    onClick={() => handleAddMod(mod)}
                    disabled={isModInList(mod.id) || addingMod === mod.id || installation.active}
                    className="gap-1"
                  >
                    {addingMod === mod.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : isModInList(mod.id) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Ajouté
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mods to Install */}
      {modsToInstall.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              À installer ({modsToInstall.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modsToInstall.map((mod) => (
                <div
                  key={mod.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    mod.isDependency ? "bg-muted/30 border-dashed" : ""
                  }`}
                >
                  {mod.icon ? (
                    <img src={mod.icon} alt={mod.name} className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Box className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{mod.name}</span>
                      {mod.isDependency && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Link2 className="h-3 w-3" />
                          Dépendance
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mod.filename} • {formatBytes(mod.size)}
                      {mod.requiredBy && (
                        <span className="ml-1">• Requis par {mod.requiredBy}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveFromList(mod.id)}
                    disabled={installation.active}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleInstall}
                disabled={installation.active}
                className="w-full gap-2"
                size="lg"
              >
                <Download className="h-5 w-5" />
                Installer {modsToInstall.length} mod(s)
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Les mods seront téléchargés dans le dossier mods du serveur
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installed Mods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Mods installés ({installedMods.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : installedMods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun mod installé dans le dossier mods
            </p>
          ) : (
            <div className="space-y-3">
              {/* Search/Filter bar */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrer les mods installés..."
                  value={installedFilter}
                  onChange={(e) => setInstalledFilter(e.target.value)}
                  className="pl-9 pr-9"
                />
                {installedFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setInstalledFilter("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Results count when filtering */}
              {installedFilter && (
                <p className="text-xs text-muted-foreground">
                  {filteredInstalledMods.length} résultat(s) sur {installedMods.length}
                </p>
              )}

              {/* Mods list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInstalledMods.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun mod ne correspond à &quot;{installedFilter}&quot;
                  </p>
                ) : (
                  filteredInstalledMods.map((mod) => (
                    <div
                      key={mod.filename}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Box className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm truncate block">{mod.filename}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(mod.size)}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteMod(mod.filename)}
                        disabled={installation.active}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {installedMods.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Redémarrez le serveur pour charger les modifications
            </p>
          )}
        </CardContent>
      </Card>

      {/* Launcher Manifest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Manifest Launcher
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilisez cette URL dans votre launcher pour synchroniser automatiquement les mods avec les joueurs.
          </p>

          {/* Manifest URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL du Manifest</label>
            <div className="flex gap-2">
              <Input
                value={getManifestUrl()}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(getManifestUrl())}
                title="Copier l'URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                asChild
                title="Ouvrir le manifest"
              >
                <a href="/api/manifest" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Manifest Stats */}
          {manifest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{manifest.mods.length}</div>
                <div className="text-xs text-muted-foreground">Mods</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatBytes(manifest.mods.reduce((acc, m) => acc + m.size, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Taille totale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{manifest.minecraft_version}</div>
                <div className="text-xs text-muted-foreground">Version MC</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium">
                  {new Date(manifest.last_updated).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">Dernière MAJ</div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                fetchManifest();
                toast.success("Manifest actualisé");
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser le manifest
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Le manifest est généré automatiquement à partir des mods installés.
            Les joueurs peuvent utiliser l&apos;URL ci-dessus dans leur launcher pour télécharger les mods.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
