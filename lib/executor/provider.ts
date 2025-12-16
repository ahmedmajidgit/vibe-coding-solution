import { waitForCommand } from "./e2b";
import {
  createSandbox as createSandboxLocal,
  runCommand as runCommandLocal,
  writeFile as writeFileLocal,
  readFile as readFileLocal,
  getCommandLogStream as getCommandLogStreamLocal,
  getCommand as getCommandLocal,
  getSandboxUrl as getSandboxUrlLocal,
} from "./e2b";

import {
  createSandboxJob,
  runCommandJob,
  writeFilesJob,
  readFileJob,
} from "@/trigger/jobs/sandbox";

const EXECUTION_MODE = process.env.EXECUTION_MODE ?? "local";
const isTrigger = EXECUTION_MODE === "trigger";

// ----------------------------
// Types
// ----------------------------
interface FilePayload {
  path: string;
  content: string;
}

interface RunCommandArgs {
  sandboxId: string;
  command: string;
  cmdArgs?: string[];
  wait?: boolean;
}

// ----------------------------
// Sandbox Functions
// ----------------------------
export async function createSandbox(opts?: {
  timeout?: number;
}): Promise<string> {
  if (!isTrigger) return createSandboxLocal(opts);

  const run = await createSandboxJob.invokeAndWaitForCompletion(
    { payload: opts ?? {} }, // input
    undefined, // options
    undefined // waitForCompletionOptions
  );

  return run.output?.sandboxId as string;
}

export async function runCommand(args: RunCommandArgs) {
  if (!isTrigger) {
    return runCommandLocal({
      sandboxId: args.sandboxId,
      command: args.command,
      args: args.cmdArgs ?? [],
    });
  }

  const run = await runCommandJob.invokeAndWaitForCompletion(
    {
      payload: {
        sandboxId: args.sandboxId,
        command: args.command,
        args: args.cmdArgs ?? [],
      },
    },
    undefined,
    undefined
  );

  const output = run.output ?? {};

  return {
    processId: (output as any).cmdId as string,
    exitCode: (output as any).exitCode as number | undefined,
    stdout: (output as any).stdout as string | undefined,
    stderr: (output as any).stderr as string | undefined,
  };
}

export async function waitForCommandResult(args: {
  sandboxId: string;
  processId: string;
}) {
  if (!isTrigger) {
    return waitForCommand({
      sandboxId: args.sandboxId,
      processId: args.processId,
    });
  }

  // In trigger mode, runCommand already waits; no-op.
  return {
    exitCode: undefined,
    stdout: "",
    stderr: "",
  };
}

export async function writeFiles(args: {
  sandboxId: string;
  files: FilePayload[];
}) {
  if (!isTrigger) {
    await Promise.all(
      args.files.map((file) =>
        writeFileLocal({
          sandboxId: args.sandboxId,
          path: file.path,
          content: file.content,
        })
      )
    );
    return;
  }

  await writeFilesJob.invokeAndWaitForCompletion(
    {
      payload: {
        sandboxId: args.sandboxId,
        files: args.files,
      },
    },
    undefined,
    undefined
  );
}

export async function writeFile(args: {
  sandboxId: string;
  path: string;
  content: string;
}) {
  return writeFiles({
    sandboxId: args.sandboxId,
    files: [{ path: args.path, content: args.content }],
  });
}

export async function readFile(args: { sandboxId: string; path: string }) {
  if (!isTrigger) return readFileLocal(args);

  const run = await readFileJob.invokeAndWaitForCompletion(
    { payload: args },
    undefined,
    undefined
  );

  return (run.output as any)?.content as string;
}

// ----------------------------
// Utility Functions
// ----------------------------
export function getCommandLogStream(args: {
  sandboxId: string;
  processId: string;
}) {
  return getCommandLogStreamLocal(args);
}

export function getCommand(args: { sandboxId: string; processId: string }) {
  return getCommandLocal(args);
}

export function getSandboxUrl(sandboxId: string, port: number) {
  return getSandboxUrlLocal(sandboxId, port);
}
