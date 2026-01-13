import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rcon } from "@/lib/rcon";
import { z } from "zod";

const commandSchema = z.object({
  command: z.string().min(1).max(1000),
});

// Commands that are not allowed for security reasons
const BLOCKED_COMMANDS = [
  "op",
  "deop",
  "pardon-ip",
  "ban-ip",
  "stop", // Use the control API instead
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { command } = commandSchema.parse(body);

    // Check for blocked commands
    const commandBase = command.split(" ")[0].toLowerCase();
    if (BLOCKED_COMMANDS.includes(commandBase)) {
      return NextResponse.json(
        { error: `Command '${commandBase}' is not allowed via the web interface` },
        { status: 403 }
      );
    }

    // Send command via RCON
    const response = await rcon.send(command);

    return NextResponse.json({
      success: true,
      response: response || "Command executed (no response)",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error executing command:", error);
    return NextResponse.json(
      { error: "Failed to execute command. Is the server running?" },
      { status: 500 }
    );
  }
}
