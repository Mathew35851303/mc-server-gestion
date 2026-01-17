import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  readServerProperties,
  writeServerProperties,
  PROPERTY_DEFINITIONS,
} from "@/lib/server-properties";
import { z } from "zod";

// GET - Read server.properties
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const properties = await readServerProperties();

    // Merge with definitions to get types and descriptions
    const enrichedProperties = Object.entries(properties).map(
      ([key, value]) => {
        const definition = PROPERTY_DEFINITIONS[key];
        return {
          key,
          value,
          type: definition?.type || "string",
          description: definition?.description || "",
          category: definition?.category || "other",
          options: definition?.options,
        };
      }
    );

    return NextResponse.json({
      properties: enrichedProperties,
    });
  } catch (error) {
    console.error("Error reading server properties:", error);
    return NextResponse.json(
      { error: "Failed to read server properties" },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  properties: z.record(z.string()),
});

// PUT - Update server.properties
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { properties } = updateSchema.parse(body);

    await writeServerProperties(properties);

    return NextResponse.json({
      success: true,
      message:
        "Settings saved. Restart the server for changes to take effect.",
      requiresRestart: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating server properties:", error);
    return NextResponse.json(
      { error: "Failed to update server properties" },
      { status: 500 }
    );
  }
}
