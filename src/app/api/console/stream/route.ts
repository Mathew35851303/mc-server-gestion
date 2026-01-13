import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContainer } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const container = await getContainer();

    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      tail: 50,
      timestamps: true,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendData = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: data })}\n\n`));
        };

        // Handle Docker multiplexed stream
        let buffer = Buffer.alloc(0);

        const processBuffer = () => {
          while (buffer.length >= 8) {
            const size = buffer.readUInt32BE(4);
            if (buffer.length < 8 + size) break;

            const line = buffer.slice(8, 8 + size).toString("utf-8").trimEnd();
            if (line) {
              sendData(line);
            }
            buffer = buffer.slice(8 + size);
          }
        };

        logStream.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          processBuffer();
        });

        logStream.on("end", () => {
          controller.close();
        });

        logStream.on("error", (error: Error) => {
          console.error("Log stream error:", error);
          controller.error(error);
        });
      },
      cancel() {
        logStream.destroy();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error streaming logs:", error);
    return NextResponse.json(
      { error: "Failed to stream logs" },
      { status: 500 }
    );
  }
}
