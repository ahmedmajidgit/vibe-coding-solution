import { NextResponse, type NextRequest } from "next/server";
import z from "zod/v3";
import { readFile as readProviderFile } from "@/lib/executor/provider";

const FileParamsSchema = z.object({
  sandboxId: z.string(),
  path: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params;
  const fileParams = FileParamsSchema.safeParse({
    path: request.nextUrl.searchParams.get("path"),
    sandboxId,
  });

  if (fileParams.success === false) {
    return NextResponse.json(
      { error: "Invalid parameters. You must pass a `path` as query" },
      { status: 400 }
    );
  }

  try {
    const content = await readProviderFile({
      sandboxId,
      path: fileParams.data.path,
    });
    return new NextResponse(content);
  } catch (error) {
    return NextResponse.json(
      { error: "File not found in the Sandbox" },
      { status: 404 }
    );
  }
}
