import { NextRequest, NextResponse } from "next/server";

/**
 * Simple health check placeholder – attempts to reconnect sandbox.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params;
  try {
    // If reconnect fails, sandbox is considered stopped.
    const { Sandbox } = await import("@e2b/sdk");
    await Sandbox.reconnect(sandboxId);
    return NextResponse.json({ status: "running" });
  } catch (error) {
    return NextResponse.json({ status: "stopped" });
  }
}
