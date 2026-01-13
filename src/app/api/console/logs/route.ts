import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContainerLogs } from "@/lib/docker";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const tail = parseInt(searchParams.get("tail") || "100");

    const logs = await getContainerLogs(Math.min(tail, 500));

    return NextResponse.json({
      logs: logs.split("\n").filter(Boolean),
    });
  } catch (error) {
    console.error("Error getting logs:", error);
    return NextResponse.json(
      { error: "Failed to get logs" },
      { status: 500 }
    );
  }
}
