import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const MODS_DIR = path.join(MINECRAFT_DATA_PATH, "mods");
const MODRINTH_API = "https://api.modrinth.com/v2";

interface ModToInstall {
  id: string;
  name: string;
  downloadUrl: string;
  filename: string;
  size: number;
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

  const buffer = Buffer.concat(chunks);
  const writeStream = createWriteStream(dest);
  writeStream.write(buffer);
  writeStream.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

// POST - Install mods with progress streaming
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let modsToInstall: ModToInstall[] = [];

  try {
    const body = await request.json();
    modsToInstall = body.mods || [];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (modsToInstall.length === 0) {
    return new Response(JSON.stringify({ error: "No mods to install" }), {
      status: 400,
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
        // Create mods directory if needed
        if (!existsSync(MODS_DIR)) {
          await mkdir(MODS_DIR, { recursive: true });
        }

        send({
          type: "start",
          totalMods: modsToInstall.length,
          mods: modsToInstall.map((m) => ({
            id: m.id,
            name: m.name,
            size: m.size,
          })),
        });

        const installed: string[] = [];
        const failed: string[] = [];

        for (let i = 0; i < modsToInstall.length; i++) {
          const mod = modsToInstall[i];
          const destPath = path.join(MODS_DIR, mod.filename);

          try {
            send({
              type: "downloading",
              modId: mod.id,
              modName: mod.name,
              modIndex: i,
              progress: 0,
            });

            await downloadFileWithProgress(mod.downloadUrl, destPath, (downloaded, total) => {
              const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
              send({
                type: "downloading",
                modId: mod.id,
                modName: mod.name,
                modIndex: i,
                progress,
                downloaded,
                total: total || mod.size,
              });
            });

            send({
              type: "modComplete",
              modId: mod.id,
              modName: mod.name,
              modIndex: i,
              filename: mod.filename,
            });

            installed.push(mod.name);
          } catch (error) {
            console.error(`Error installing mod ${mod.id}:`, error);
            send({
              type: "modError",
              modId: mod.id,
              modName: mod.name,
              modIndex: i,
              error: String(error),
            });
            failed.push(mod.name);
          }
        }

        send({
          type: "complete",
          message: `${installed.length} mod(s) installé(s)${failed.length > 0 ? `, ${failed.length} échec(s)` : ""}`,
          installed,
          failed,
        });

        controller.close();
      } catch (error) {
        console.error("Error installing mods:", error);
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
