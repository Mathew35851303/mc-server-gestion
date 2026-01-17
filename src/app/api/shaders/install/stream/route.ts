import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { mkdir } from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import path from "path";

const MINECRAFT_DATA_PATH = process.env.MC_DATA_PATH || "/minecraft-data";
const SHADERPACKS_DIR = path.join(MINECRAFT_DATA_PATH, "shaderpacks");

interface ShaderToInstall {
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

// POST - Install shaders with progress streaming
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let shadersToInstall: ShaderToInstall[] = [];

  try {
    const body = await request.json();
    shadersToInstall = body.shaders || [];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (shadersToInstall.length === 0) {
    return new Response(JSON.stringify({ error: "No shaders to install" }), {
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
        // Create shaderpacks directory if needed
        if (!existsSync(SHADERPACKS_DIR)) {
          await mkdir(SHADERPACKS_DIR, { recursive: true });
        }

        send({
          type: "start",
          totalShaders: shadersToInstall.length,
          shaders: shadersToInstall.map((s) => ({
            id: s.id,
            name: s.name,
            size: s.size,
          })),
        });

        const installed: string[] = [];
        const failed: string[] = [];

        for (let i = 0; i < shadersToInstall.length; i++) {
          const shader = shadersToInstall[i];
          const destPath = path.join(SHADERPACKS_DIR, shader.filename);

          try {
            send({
              type: "downloading",
              shaderId: shader.id,
              shaderName: shader.name,
              shaderIndex: i,
              progress: 0,
            });

            await downloadFileWithProgress(shader.downloadUrl, destPath, (downloaded, total) => {
              const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
              send({
                type: "downloading",
                shaderId: shader.id,
                shaderName: shader.name,
                shaderIndex: i,
                progress,
                downloaded,
                total: total || shader.size,
              });
            });

            send({
              type: "shaderComplete",
              shaderId: shader.id,
              shaderName: shader.name,
              shaderIndex: i,
              filename: shader.filename,
            });

            installed.push(shader.name);
          } catch (error) {
            console.error(`Error installing shader ${shader.id}:`, error);
            send({
              type: "shaderError",
              shaderId: shader.id,
              shaderName: shader.name,
              shaderIndex: i,
              error: String(error),
            });
            failed.push(shader.name);
          }
        }

        send({
          type: "complete",
          message: `${installed.length} shader(s) installé(s)${failed.length > 0 ? `, ${failed.length} échec(s)` : ""}`,
          installed,
          failed,
        });

        controller.close();
      } catch (error) {
        console.error("Error installing shaders:", error);
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
