import { NextResponse, type NextRequest } from "next/server";
import { getCommand } from "@/lib/executor/provider";

interface Params {
  sandboxId: string;
  cmdId: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cmdParams = await params;
  const command = await getCommand({
    sandboxId: cmdParams.sandboxId,
    processId: cmdParams.cmdId,
  });
  if (!command) {
    return NextResponse.json({ error: "Command not found" }, { status: 404 });
  }
  return NextResponse.json({
    sandboxId: command.sandboxId,
    cmdId: command.cmdId,
    startedAt: command.startedAt,
    exitCode: command.exitCode,
  });
}
