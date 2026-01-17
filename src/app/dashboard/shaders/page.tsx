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
  Download,
  Check,
  Loader2,
  FolderOpen,
  AlertTriangle,
  Sparkles,
  Filter,
  X,
  Copy,
  ExternalLink,
  FileJson,
  Upload,
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

interface ShaderToInstall {
  id: string;
  name: string;
  icon: string | null;
  downloadUrl: string;
  filename: string;
  size: number;
}

interface InstalledShader {
  filename: string;
  size: number;
}

interface ShaderProgress {
  shaderId: string;
  shaderName: string;
  status: "pending" | "downloading" | "complete" | "error";
  progress: number;
  downloaded?: number;
  total?: number;
  error?: string;
}

interface InstallationState {
  active: boolean;
  shaders: ShaderProgress[];
}

interface ShaderManifest {
  version: string;
  minecraft_version: string;
  last_updated: string;
  shaders: Array<{
    filename: string;
    size: number;
    sha256: string;
    url: string;
  }>;
}

export default function ShadersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [shadersToInstall, setShadersToInstall] = useState<ShaderToInstall[]>([]);
  const [installedShaders, setInstalledShaders] = useState<InstalledShader[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingShader, setAddingShader] = useState<string | null>(null);
  const [installation, setInstallation] = useState<InstallationState>({
    active: false,
    shaders: [],
  });
  const [installedFilter, setInstalledFilter] = useState("");
  const [manifest, setManifest] = useState<ShaderManifest | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  // Filter installed shaders
  const filteredInstalledShaders = installedShaders.filter((shader) =>
    shader.filename.toLowerCase().includes(installedFilter.toLowerCase())
  );

  // Fetch installed shaders
  const fetchInstalledShaders = useCallback(async () => {
    try {
      const response = await fetch("/api/shaders");
      if (response.ok) {
        const data = await response.json();
        setInstalledShaders(data.shaders || []);
      }
    } catch (error) {
      console.error("Failed to fetch shaders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch manifest
  const fetchManifest = useCallback(async () => {
    setManifestLoading(true);
    try {
      const response = await fetch("/api/manifest/shaders");
      if (response.ok) {
        const data = await response.json();
        setManifest(data);
      }
    } catch (error) {
      console.error("Failed to fetch manifest:", error);
    } finally {
      setManifestLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstalledShaders();
    fetchManifest();
  }, [fetchInstalledShaders, fetchManifest]);

  // Search for shaders
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `/api/shaders/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.shaders);
      }
    } catch (error) {
      toast.error("Erreur lors de la recherche");
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  // Add shader to install list
  const handleAddShader = async (shader: SearchResult) => {
    setAddingShader(shader.id);
    try {
      const detailsRes = await fetch(`/api/shaders/${shader.id}`);
      if (!detailsRes.ok) {
        const err = await detailsRes.json();
        throw new Error(err.error || "Failed to get shader details");
      }
      const details = await detailsRes.json();

      // Check if already in list
      if (shadersToInstall.some((s) => s.id === details.id)) {
        toast.warning("Ce shader est déjà dans la liste");
        return;
      }

      // Check if already installed
      if (installedShaders.some((s) => s.filename === details.file.filename)) {
        toast.warning("Ce shader est déjà installé");
        return;
      }

      setShadersToInstall((prev) => [
        ...prev,
        {
          id: details.id,
          name: details.name,
          icon: details.icon,
          downloadUrl: details.file.url,
          filename: details.file.filename,
          size: details.file.size,
        },
      ]);

      toast.success(`${shader.name} ajouté à la liste`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout");
      console.error("Add error:", error);
    } finally {
      setAddingShader(null);
    }
  };

  // Remove shader from install list
  const handleRemoveFromList = (shaderId: string) => {
    setShadersToInstall((prev) => prev.filter((s) => s.id !== shaderId));
  };

  // Delete installed shader
  const handleDeleteShader = async (filename: string) => {
    try {
      const response = await fetch("/api/shaders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      if (response.ok) {
        toast.success(`${filename} supprimé`);
        await fetchInstalledShaders();
        await fetchManifest();
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error("Delete error:", error);
    }
  };

  // Install shaders with progress
  const handleInstall = async () => {
    if (shadersToInstall.length === 0) return;

    setInstallation({
      active: true,
      shaders: shadersToInstall.map((s) => ({
        shaderId: s.id,
        shaderName: s.name,
        status: "pending",
        progress: 0,
      })),
    });

    try {
      const response = await fetch("/api/shaders/install/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shaders: shadersToInstall }),
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
                shaders: prev.shaders.map((s) =>
                  s.shaderId === data.shaderId
                    ? {
                        ...s,
                        status: "downloading",
                        progress: data.progress || 0,
                        downloaded: data.downloaded,
                        total: data.total,
                      }
                    : s
                ),
              }));
              break;

            case "shaderComplete":
              setInstallation((prev) => ({
                ...prev,
                shaders: prev.shaders.map((s) =>
                  s.shaderId === data.shaderId
                    ? { ...s, status: "complete", progress: 100 }
                    : s
                ),
              }));
              break;

            case "shaderError":
              setInstallation((prev) => ({
                ...prev,
                shaders: prev.shaders.map((s) =>
                  s.shaderId === data.shaderId
                    ? { ...s, status: "error", error: data.error }
                    : s
                ),
              }));
              break;

            case "complete":
              setInstallation({ active: false, shaders: [] });
              setShadersToInstall([]);
              toast.success(data.message);
              await fetchInstalledShaders();
              await fetchManifest();
              break;

            case "error":
              setInstallation({ active: false, shaders: [] });
              toast.error(data.message);
              break;
          }
        }
      }
    } catch (error) {
      setInstallation({ active: false, shaders: [] });
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

  const isShaderInList = (shaderId: string) => shadersToInstall.some((s) => s.id === shaderId);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      toast.error("Seuls les fichiers .zip sont acceptés");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/shaders/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${file.name} importé avec succès`);
        await fetchInstalledShaders();
        await fetchManifest();
      } else {
        toast.error(data.error || "Erreur lors de l'import");
      }
    } catch (error) {
      toast.error("Erreur lors de l'import");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const copyManifestUrl = () => {
    const url = `${window.location.origin}/api/manifest/shaders`;
    navigator.clipboard.writeText(url);
    toast.success("URL du manifest copiée !");
  };

  const getTotalSize = () => {
    if (!manifest) return 0;
    return manifest.shaders.reduce((acc, shader) => acc + shader.size, 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: ShaderProgress["status"]) => {
    switch (status) {
      case "pending":
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
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
          <h1 className="text-3xl font-bold">Shaders</h1>
          <p className="text-muted-foreground">
            Recherchez et installez des shaders depuis Modrinth
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={uploading || installation.active}
            className="gap-2"
            asChild
          >
            <label className="cursor-pointer">
              {uploading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importer
              <input
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading || installation.active}
              />
            </label>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchInstalledShaders}
            disabled={loading || installation.active}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
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
            {installation.shaders.map((shader) => (
              <div key={shader.shaderId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(shader.status)}
                    <span className={shader.status === "complete" ? "text-muted-foreground" : ""}>
                      {shader.shaderName}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {shader.status === "downloading" && shader.downloaded && shader.total
                      ? `${formatBytes(shader.downloaded)} / ${formatBytes(shader.total)}`
                      : shader.status === "downloading"
                        ? `${shader.progress}%`
                        : shader.status === "complete"
                          ? "Installé"
                          : shader.status === "error"
                            ? "Erreur"
                            : "En attente"}
                  </span>
                </div>
                <Progress value={shader.progress} className="h-2" />
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
              placeholder="Rechercher un shader..."
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
              {searchResults.map((shader) => (
                <div
                  key={shader.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {shader.icon ? (
                    <img src={shader.icon} alt={shader.name} className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{shader.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        {formatNumber(shader.downloads)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {shader.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isShaderInList(shader.id) ? "secondary" : "default"}
                    onClick={() => handleAddShader(shader)}
                    disabled={isShaderInList(shader.id) || addingShader === shader.id || installation.active}
                    className="gap-1"
                  >
                    {addingShader === shader.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : isShaderInList(shader.id) ? (
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

      {/* Shaders to Install */}
      {shadersToInstall.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              À installer ({shadersToInstall.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shadersToInstall.map((shader) => (
                <div
                  key={shader.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  {shader.icon ? (
                    <img src={shader.icon} alt={shader.name} className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{shader.name}</span>
                    <div className="text-xs text-muted-foreground">
                      {shader.filename} • {formatBytes(shader.size)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveFromList(shader.id)}
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
                Installer {shadersToInstall.length} shader(s)
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Les shaders seront téléchargés dans le dossier shaderpacks
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installed Shaders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Shaders installés ({installedShaders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : installedShaders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun shader installé dans le dossier shaderpacks
            </p>
          ) : (
            <div className="space-y-3">
              {/* Search/Filter bar */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrer les shaders installés..."
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
                  {filteredInstalledShaders.length} résultat(s) sur {installedShaders.length}
                </p>
              )}

              {/* Shaders list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInstalledShaders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun shader ne correspond à &quot;{installedFilter}&quot;
                  </p>
                ) : (
                  filteredInstalledShaders.map((shader) => (
                    <div
                      key={shader.filename}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm truncate block">{shader.filename}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(shader.size)}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteShader(shader.filename)}
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

          {installedShaders.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Les joueurs doivent installer les shaders côté client
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manifest Launcher Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Manifest Launcher
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilisez ce manifest pour synchroniser automatiquement les shaders avec votre launcher.
          </p>

          {/* URL Copy Section */}
          <div className="flex gap-2">
            <Input
              value={typeof window !== "undefined" ? `${window.location.origin}/api/manifest/shaders` : "/api/manifest/shaders"}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyManifestUrl}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open("/api/manifest/shaders", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          {manifestLoading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : manifest ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{manifest.shaders.length}</div>
                <div className="text-xs text-muted-foreground">Shaders</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{formatBytes(getTotalSize())}</div>
                <div className="text-xs text-muted-foreground">Taille totale</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{manifest.minecraft_version}</div>
                <div className="text-xs text-muted-foreground">Version MC</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-lg font-bold">{formatDate(manifest.last_updated)}</div>
                <div className="text-xs text-muted-foreground">Dernière MAJ</div>
              </div>
            </div>
          ) : null}

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={fetchManifest}
            disabled={manifestLoading}
            className="w-full gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${manifestLoading ? "animate-spin" : ""}`} />
            Rafraîchir le manifest
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            L&apos;endpoint <code className="bg-muted px-1 rounded">/api/manifest/shaders</code> est public pour permettre l&apos;accès depuis le launcher
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
