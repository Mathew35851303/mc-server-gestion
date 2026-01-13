import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startContainer, stopContainer, restartContainer } from "@/lib/docker";
import { z } from "zod";

const controlSchema = z.object({
  action: z.enum(["start", "stop", "restart"]),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = controlSchema.parse(body);

    switch (action) {
      case "start":
        await startContainer();
        return NextResponse.json({
          success: true,
          message: "Server starting...",
        });

      case "stop":
        await stopContainer();
        return NextResponse.json({
          success: true,
          message: "Server stopping...",
        });

      case "restart":
        await restartContainer();
        return NextResponse.json({
          success: true,
          message: "Server restarting...",
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error controlling server:", error);
    return NextResponse.json(
      { error: "Failed to control server" },
      { status: 500 }
    );
  }
}
