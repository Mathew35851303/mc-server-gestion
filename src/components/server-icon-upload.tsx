"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Trash2, RefreshCw, ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export function ServerIconUpload() {
  const [icon, setIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    fetchIcon();
  }, []);

  const fetchIcon = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/icon");
      if (response.ok) {
        const data = await response.json();
        setIcon(data.icon);
      }
    } catch (err) {
      console.error("Failed to fetch icon:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("icon", file);

      const response = await fetch("/api/settings/icon", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setIcon(data.icon);
        toast.success("Icône uploadée. Redémarrez le serveur pour appliquer.");
      } else {
        toast.error(data.error || "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch("/api/settings/icon", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setIcon(null);
        toast.success("Icône supprimée");
      } else {
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Icône du serveur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          L'icône du serveur doit être une image PNG de 64x64 pixels.
          Elle sera affichée dans la liste des serveurs Minecraft.
        </p>

        {/* Icon preview */}
        <div className="flex items-start gap-6">
          <div className="relative">
            {loading ? (
              <div className="w-16 h-16 rounded bg-muted animate-pulse flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : icon ? (
              <div className="relative group">
                <img
                  src={icon}
                  alt="Server icon"
                  className="w-16 h-16 rounded border bg-muted"
                  style={{ imageRendering: "pixelated" }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:text-red-400"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {icon ? "Changer l'icône" : "Uploader une icône"}
            </Button>

            {icon && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
