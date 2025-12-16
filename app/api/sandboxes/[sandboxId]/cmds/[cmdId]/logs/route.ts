import { NextResponse, type NextRequest } from "next/server";
import { getCommandLogStream } from "@/lib/executor/provider";

interface Params {
  sandboxId: string;
  cmdId: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const logParams = await params;
  const encoder = new TextEncoder();
  const logStream = await getCommandLogStream({
    sandboxId: logParams.sandboxId,
    processId: logParams.cmdId,
  });

  return new NextResponse(
    new ReadableStream({
      async pull(controller) {
        for await (const logline of logStream) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                data: logline.data,
                stream: logline.stream,
                timestamp: logline.timestamp,
              }) + "\n"
            )
          );
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson" } }
  );
}
