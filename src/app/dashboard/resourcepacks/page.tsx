"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Package,
  Download,
  Sparkles,
  Check,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/toaster";

interface SearchResult {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  downloads: number;
}

interface SelectedPack {
  id: string;
  name: string;
  icon: string | null;
  version: string;
  downloadUrl: string;
  filename: string;
  sha1: string;
  size: number;
  addedAt: string;
}

interface GeneratedPack {
  filename: string;
  sha1: string;
  generatedAt: string;
  url: string;
}

export default function ResourcePacksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<SelectedPack[]>([]);
  const [generatedPack, setGeneratedPack] = useState<GeneratedPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addingPack, setAddingPack] = useState<string | null>(null);
  const toast = useToast();

  // Fetch current selected packs
  const fetchSelectedPacks = useCallback(async () => {
    try {
      const response = await fetch("/api/resourcepacks");
      if (response.ok) {
        const data = await response.json();
        setSelectedPacks(data.selectedPacks || []);
        setGeneratedPack(data.generatedPack);
      }
    } catch (error) {
      console.error("Failed to fetch packs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelectedPacks();
  }, [fetchSelectedPacks]);

  // Search for resource packs
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `/api/resourcepacks/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.packs);
      }
    } catch (error) {
      toast.error("Erreur lors de la recherche");
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  // Add pack to list
  const handleAddPack = async (pack: SearchResult) => {
    setAddingPack(pack.id);
    try {
      // First get full details including download URL
      const detailsRes = await fetch(`/api/resourcepacks/${pack.id}`);
      if (!detailsRes.ok) {
        throw new Error("Failed to get pack details");
      }
      const details = await detailsRes.json();

      // Add to list
      const response = await fetch("/api/resourcepacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: details.id,
          name: details.name,
          icon: details.icon,
          version: details.version.number,
          downloadUrl: details.file.url,
          filename: details.file.filename,
          sha1: details.file.sha1,
          size: details.file.size,
        }),
      });

      if (response.ok) {
        toast.success(`${pack.name} ajouté à la liste`);
        await fetchSelectedPacks();
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      toast.error("Erreur lors de l'ajout du pack");
      console.error("Add error:", error);
    } finally {
      setAddingPack(null);
    }
  };

  // Remove pack from list
  const handleRemovePack = async (packId: string) => {
    try {
      const response = await fetch("/api/resourcepacks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: packId }),
      });

      if (response.ok) {
        toast.success("Pack retiré de la liste");
        await fetchSelectedPacks();
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error("Remove error:", error);
    }
  };

  // Generate merged pack
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/resourcepacks/generate", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setGeneratedPack(data.pack);
      } else {
        toast.error(data.error || "Erreur lors de la génération");
      }
    } catch (error) {
      toast.error("Erreur lors de la génération");
      console.error("Generate error:", error);
    } finally {
      setGenerating(false);
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

  const isPackSelected = (packId: string) =>
    selectedPacks.some((p) => p.id === packId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resource Packs</h1>
          <p className="text-muted-foreground">
            Recherchez et combinez des resource packs pour votre serveur
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchSelectedPacks}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

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
              placeholder="Rechercher un resource pack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching} className="gap-2">
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {pack.icon ? (
                    <img
                      src={pack.icon}
                      alt={pack.name}
                      className="w-10 h-10 rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{pack.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        {formatNumber(pack.downloads)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {pack.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isPackSelected(pack.id) ? "secondary" : "default"}
                    onClick={() => handleAddPack(pack)}
                    disabled={isPackSelected(pack.id) || addingPack === pack.id}
                    className="gap-1"
                  >
                    {addingPack === pack.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : isPackSelected(pack.id) ? (
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

      {/* Selected Packs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Packs sélectionnés ({selectedPacks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPacks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun resource pack sélectionné. Utilisez la recherche pour en ajouter.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedPacks.map((pack, index) => (
                <div
                  key={pack.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <span className="text-muted-foreground text-sm font-mono w-6">
                    {index + 1}.
                  </span>
                  {pack.icon ? (
                    <img
                      src={pack.icon}
                      alt={pack.name}
                      className="w-10 h-10 rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{pack.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>v{pack.version}</span>
                      <span>•</span>
                      <span>{formatBytes(pack.size)}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemovePack(pack.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Generate Button */}
          {selectedPacks.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full gap-2"
                size="lg"
              >
                {generating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {generating
                  ? "Génération en cours..."
                  : selectedPacks.length === 1
                    ? "Appliquer le resource pack"
                    : `Fusionner et appliquer (${selectedPacks.length} packs)`}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {selectedPacks.length > 1
                  ? "Les packs seront fusionnés dans l'ordre affiché (le dernier a priorité)"
                  : "Le pack sera configuré dans server.properties"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Pack Info */}
      {generatedPack && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-5 w-5" />
              Resource Pack actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fichier:</span>
                <span className="font-mono">{generatedPack.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SHA1:</span>
                <span className="font-mono text-xs">{generatedPack.sha1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Généré le:</span>
                <span>{new Date(generatedPack.generatedAt).toLocaleString()}</span>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a
                    href={generatedPack.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Télécharger
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Redémarrez le serveur pour appliquer les changements.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
