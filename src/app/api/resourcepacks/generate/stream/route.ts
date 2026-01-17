import { auth } from "@/lib/auth";
import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { existsSync, createWriteStream, statSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const RESOURCEPACKS_CONFIG = path.join(MINECRAFT_DATA_PATH, "mc-admin-resourcepacks.json");
const RESOURCEPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "resourcepacks");
const GENERATED_PACK_NAME = "server-resourcepack.zip";
const SERVER_PROPERTIES_PATH = process.env.MC_PROPERTIES_PATH || path.join(MINECRAFT_DATA_PATH, "server.properties");

interface SelectedPack {
  id: string;
  name: string;
  downloadUrl: string;
  filename: string;
  sha1: string;
  size: number;
}

interface ResourcePackConfig {
  selectedPacks: SelectedPack[];
  generatedPack: {
    filename: string;
    sha1: string;
    generatedAt: string;
    url: string;
  } | null;
}

async function getConfig(): Promise<ResourcePackConfig> {
  try {
    if (existsSync(RESOURCEPACKS_CONFIG)) {
      const content = await readFile(RESOURCEPACKS_CONFIG, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading resourcepacks config:", error);
  }
  return { selectedPacks: [], generatedPack: null };
}

async function saveConfig(config: ResourcePackConfig): Promise<void> {
  await writeFile(RESOURCEPACKS_CONFIG, JSON.stringify(config, null, 2));
}

async function downloadFileWithProgress(
  url: string,
  dest: string,
  onProgress: (downloaded: number, total: number) => void
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    downloaded += value.length;
    onProgress(downloaded, contentLength);
  }

  // Write to file
  const buffer = Buffer.concat(chunks);
  const writeStream = createWriteStream(dest);
  writeStream.write(buffer);
  writeStream.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

async function calculateSha1(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha1").update(content).digest("hex");
}

async function updateServerProperties(packUrl: string, sha1: string): Promise<void> {
  let content = "";

  if (existsSync(SERVER_PROPERTIES_PATH)) {
    content = await readFile(SERVER_PROPERTIES_PATH, "utf-8");
  }

  if (content.includes("resource-pack=")) {
    content = content.replace(/resource-pack=.*/g, `resource-pack=${packUrl}`);
  } else {
    content += `\nresource-pack=${packUrl}`;
  }

  if (content.includes("resource-pack-sha1=")) {
    content = content.replace(/resource-pack-sha1=.*/g, `resource-pack-sha1=${sha1}`);
  } else {
    content += `\nresource-pack-sha1=${sha1}`;
  }

  if (content.includes("require-resource-pack=")) {
    content = content.replace(/require-resource-pack=.*/g, "require-resource-pack=false");
  } else {
    content += `\nrequire-resource-pack=false`;
  }

  await writeFile(SERVER_PROPERTIES_PATH, content);
}

// GET - Stream generation progress via SSE
export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const config = await getConfig();

        if (config.selectedPacks.length === 0) {
          send({ type: "error", message: "No resource packs selected" });
          controller.close();
          return;
        }

        // Create resourcepacks directory
        if (!existsSync(RESOURCEPACKS_DIR)) {
          await mkdir(RESOURCEPACKS_DIR, { recursive: true });
        }

        const totalPacks = config.selectedPacks.length;
        send({
          type: "start",
          totalPacks,
          packs: config.selectedPacks.map((p) => ({
            id: p.id,
            name: p.name,
            size: p.size,
          })),
        });

        // For single pack
        if (totalPacks === 1) {
          const pack = config.selectedPacks[0];
          const destPath = path.join(RESOURCEPACKS_DIR, GENERATED_PACK_NAME);

          send({
            type: "downloading",
            packId: pack.id,
            packName: pack.name,
            packIndex: 0,
            progress: 0,
          });

          await downloadFileWithProgress(pack.downloadUrl, destPath, (downloaded, total) => {
            const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            send({
              type: "downloading",
              packId: pack.id,
              packName: pack.name,
              packIndex: 0,
              progress,
              downloaded,
              total,
            });
          });

          send({ type: "processing", message: "Calcul du hash SHA1..." });
          const sha1 = await calculateSha1(destPath);

          send({ type: "processing", message: "Mise à jour de server.properties..." });
          const packUrl = `/api/resourcepacks/serve/${GENERATED_PACK_NAME}`;
          await updateServerProperties(packUrl, sha1);

          config.generatedPack = {
            filename: GENERATED_PACK_NAME,
            sha1,
            generatedAt: new Date().toISOString(),
            url: packUrl,
          };
          await saveConfig(config);

          send({
            type: "complete",
            message: "Resource pack généré avec succès",
            pack: config.generatedPack,
          });
          controller.close();
          return;
        }

        // For multiple packs - download all then merge
        const JSZip = (await import("jszip")).default;
        const mergedZip = new JSZip();
        let packMcmeta: { pack: { pack_format: number; description: string } } | null = null;

        for (let i = 0; i < config.selectedPacks.length; i++) {
          const pack = config.selectedPacks[i];
          const tempPath = path.join(RESOURCEPACKS_DIR, `temp_${pack.id}.zip`);

          try {
            // Download with progress
            send({
              type: "downloading",
              packId: pack.id,
              packName: pack.name,
              packIndex: i,
              progress: 0,
            });

            await downloadFileWithProgress(pack.downloadUrl, tempPath, (downloaded, total) => {
              const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
              send({
                type: "downloading",
                packId: pack.id,
                packName: pack.name,
                packIndex: i,
                progress,
                downloaded,
                total,
              });
            });

            send({
              type: "extracting",
              packId: pack.id,
              packName: pack.name,
              packIndex: i,
            });

            // Read and extract zip
            const zipData = await readFile(tempPath);
            const zip = await JSZip.loadAsync(zipData);

            const fileCount = Object.keys(zip.files).filter((f) => !zip.files[f].dir).length;
            let processedFiles = 0;

            for (const [filename, file] of Object.entries(zip.files)) {
              if (file.dir) continue;

              if (filename === "pack.mcmeta" && !packMcmeta) {
                const content = await file.async("string");
                packMcmeta = JSON.parse(content);
                processedFiles++;
                continue;
              }

              if (filename === "pack.mcmeta") {
                processedFiles++;
                continue;
              }

              const content = await file.async("nodebuffer");
              mergedZip.file(filename, content);
              processedFiles++;

              // Send progress every 50 files to avoid too many updates
              if (processedFiles % 50 === 0) {
                send({
                  type: "extracting",
                  packId: pack.id,
                  packName: pack.name,
                  packIndex: i,
                  filesProcessed: processedFiles,
                  totalFiles: fileCount,
                });
              }
            }

            await rm(tempPath);

            send({
              type: "packComplete",
              packId: pack.id,
              packName: pack.name,
              packIndex: i,
            });
          } catch (error) {
            console.error(`Error processing pack ${pack.id}:`, error);
            if (existsSync(tempPath)) {
              await rm(tempPath);
            }
            send({
              type: "packError",
              packId: pack.id,
              packName: pack.name,
              packIndex: i,
              error: String(error),
            });
          }
        }

        send({ type: "merging", message: "Création du pack fusionné..." });

        // Add pack.mcmeta
        if (packMcmeta) {
          packMcmeta.pack.description = `Merged: ${config.selectedPacks.map((p) => p.name).join(", ")}`;
          mergedZip.file("pack.mcmeta", JSON.stringify(packMcmeta, null, 2));
        } else {
          mergedZip.file(
            "pack.mcmeta",
            JSON.stringify({
              pack: {
                pack_format: 15,
                description: `Merged: ${config.selectedPacks.map((p) => p.name).join(", ")}`,
              },
            }, null, 2)
          );
        }

        send({ type: "compressing", message: "Compression du pack final..." });

        const destPath = path.join(RESOURCEPACKS_DIR, GENERATED_PACK_NAME);
        const mergedContent = await mergedZip.generateAsync({
          type: "nodebuffer",
          compression: "DEFLATE",
          compressionOptions: { level: 9 },
        });

        await writeFile(destPath, mergedContent);

        send({ type: "processing", message: "Calcul du hash SHA1..." });
        const sha1 = await calculateSha1(destPath);

        send({ type: "processing", message: "Mise à jour de server.properties..." });
        const packUrl = `/api/resourcepacks/serve/${GENERATED_PACK_NAME}`;
        await updateServerProperties(packUrl, sha1);

        config.generatedPack = {
          filename: GENERATED_PACK_NAME,
          sha1,
          generatedAt: new Date().toISOString(),
          url: packUrl,
        };
        await saveConfig(config);

        const finalSize = statSync(destPath).size;

        send({
          type: "complete",
          message: `${config.selectedPacks.length} packs fusionnés avec succès`,
          pack: config.generatedPack,
          finalSize,
        });
        controller.close();
      } catch (error) {
        console.error("Error generating resource pack:", error);
        send({ type: "error", message: String(error) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
