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

export async function createSandbox(opts?: { timeout?: number }) {
  if (!isTrigger) return createSandboxLocal(opts);
  const run = await createSandboxJob.invokeAndWaitForCompletion({
    payload: {},
  });
  return run.output?.sandboxId as string;
}

export async function runCommand(args: {
  sandboxId: string;
  command: string;
  cmdArgs?: string[];
  wait?: boolean;
}) {
  if (!isTrigger) {
    return runCommandLocal({
      sandboxId: args.sandboxId,
      command: args.command,
      args: args.cmdArgs ?? [],
    });
  }
  // In trigger mode, we always wait for completion to return consistent data.
  const run = await runCommandJob.invokeAndWaitForCompletion({
    payload: {
      sandboxId: args.sandboxId,
      command: args.command,
      args: args.cmdArgs ?? [],
    },
  });
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
  files: { path: string; content: string }[];
}) {
  if (!isTrigger) {
    for (const file of args.files) {
      await writeFileLocal({
        sandboxId: args.sandboxId,
        path: file.path,
        content: file.content,
      });
    }
    return;
  }
  await writeFilesJob.invokeAndWaitForCompletion({
    payload: {
      sandboxId: args.sandboxId,
      files: args.files,
    },
  });
}
export async function writeFile(args: {
  sandboxId: string;
  path: string;
  content: string;
}) {
  return writeFiles({
    sandboxId: args.sandboxId,
    files: [
      {
        path: args.path,
        content: args.content,
      },
    ],
  });
}

export async function readFile(args: { sandboxId: string; path: string }) {
  if (!isTrigger) {
    return readFileLocal(args);
  }
  const run = await readFileJob.invokeAndWaitForCompletion({
    payload: args,
  });
  return (run.output as any)?.content as string;
}

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
