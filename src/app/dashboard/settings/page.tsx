"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectOption } from "@/components/ui/select";
import { RefreshCw, Save, AlertTriangle } from "lucide-react";
import { ServerIconUpload } from "@/components/server-icon-upload";
import { useToast } from "@/components/ui/toaster";

interface ServerProperty {
  key: string;
  value: string;
  type: "string" | "number" | "boolean";
  description: string;
  category: string;
}

const categoryLabels: Record<string, string> = {
  general: "Général",
  gameplay: "Gameplay",
  world: "Monde",
  network: "Réseau",
  security: "Sécurité",
  performance: "Performance",
  other: "Autres",
};

const categoryOrder = [
  "general",
  "gameplay",
  "world",
  "security",
  "performance",
  "network",
  "other",
];

export default function SettingsPage() {
  const [properties, setProperties] = useState<ServerProperty[]>([]);
  const [modified, setModified] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setModified((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (prop: ServerProperty) => {
    return modified[prop.key] !== undefined ? modified[prop.key] : prop.value;
  };

  const hasChanges = Object.keys(modified).length > 0;

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: modified }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Paramètres sauvegardés. Redémarrez le serveur pour appliquer.");
        setModified({});
        await fetchSettings();
      } else {
        toast.error(data.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setModified({});
  };

  // Group properties by category
  const groupedProperties = properties.reduce(
    (acc, prop) => {
      const category = prop.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(prop);
      return acc;
    },
    {} as Record<string, ServerProperty[]>
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Configuration du fichier server.properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary">
              {Object.keys(modified).length} modification(s)
            </Badge>
          )}
          <Button variant="outline" size="icon" onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500">Attention</p>
          <p className="text-muted-foreground">
            Les modifications nécessitent un redémarrage du serveur pour être
            appliquées. Certains paramètres peuvent affecter le gameplay ou la
            sécurité.
          </p>
        </div>
      </div>

      {/* Server Icon */}
      <ServerIconUpload />

      {/* Settings by category */}
      <div className="space-y-6">
        {categoryOrder.map((category) => {
          const props = groupedProperties[category];
          if (!props || props.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{categoryLabels[category] || category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {props.map((prop) => {
                  const isModified = modified[prop.key] !== undefined;
                  return (
                    <div key={prop.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={prop.key} className="font-mono text-sm">
                          {prop.key}
                        </Label>
                        {isModified && (
                          <Badge variant="secondary" className="text-xs">
                            modifié
                          </Badge>
                        )}
                      </div>
                      {prop.description && (
                        <p className="text-xs text-muted-foreground">
                          {prop.description}
                        </p>
                      )}
                      {prop.type === "boolean" ? (
                        <Select
                          id={prop.key}
                          value={getValue(prop)}
                          onChange={(e) => handleChange(prop.key, e.target.value)}
                          className="max-w-xs"
                        >
                          <SelectOption value="true">true</SelectOption>
                          <SelectOption value="false">false</SelectOption>
                        </Select>
                      ) : (
                        <Input
                          id={prop.key}
                          type={prop.type === "number" ? "number" : "text"}
                          value={getValue(prop)}
                          onChange={(e) => handleChange(prop.key, e.target.value)}
                          className="max-w-md"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      {hasChanges && (
        <div className="sticky bottom-6 flex justify-end gap-2 rounded-lg border bg-card p-4 shadow-lg">
          <Button variant="outline" onClick={handleReset}>
            Annuler les modifications
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      )}
    </div>
  );
}
