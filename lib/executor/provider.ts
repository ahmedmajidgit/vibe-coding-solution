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
    "create-sandbox", // cacheKey
    opts ?? {}, // payload
    undefined, // timeoutInSeconds
    undefined // options
  );
  // Check if the run succeeded
  if ("output" in run) {
    return run.output.sandboxId;
  }

  // Failed run
  throw new Error(`Sandbox creation failed: ${JSON.stringify(run)}`);
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
    "run-command", // cacheKey
    {
      sandboxId: args.sandboxId,
      command: args.command,
      args: args.cmdArgs ?? [],
    },
    undefined,
    undefined
  );

  // Narrow type: only proceed if 'output' exists
  if (!("output" in run)) {
    throw new Error(`Command failed: ${JSON.stringify(run)}`);
  }

  const output = run.output;

  return {
    processId: output.cmdId,
    exitCode: output.exitCode,
    stdout: output.stdout,
    stderr: output.stderr,
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
    "write-files", // cacheKey
    {
      sandboxId: args.sandboxId,
      files: args.files,
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
    "read-file", // cacheKey
    args,
    undefined,
    undefined
  );

  // Narrow type to check if the job succeeded
  if (!("output" in run)) {
    throw new Error(`Failed to read file: ${JSON.stringify(run)}`);
  }

  return run.output.content;
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
