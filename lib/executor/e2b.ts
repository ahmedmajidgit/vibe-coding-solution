import { Sandbox, type SandboxOpts } from "@e2b/sdk";

type CommandLog = {
  data: string;
  stream: "stdout" | "stderr";
  timestamp: number;
};

type StoredProcess = {
  processId: string;
  command: string;
  args: string[];
  logs: CommandLog[];
  exitCode?: number;
  startedAt: number;
  wait?: () => Promise<{
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  }>;
  listeners: Set<(log: CommandLog) => void>;
  resolveDone: () => void;
  donePromise: Promise<void>;
};

type StoredSandbox = {
  id: string;
  sandbox: Sandbox;
  createdAt: number;
  processes: Map<string, StoredProcess>;
};

const sandboxes = new Map<string, StoredSandbox>();

function getTemplate() {
  return process.env.E2B_TEMPLATE || "base";
}

async function getOrReconnectSandbox(
  sandboxId: string
): Promise<StoredSandbox> {
  const existing = sandboxes.get(sandboxId);
  if (existing) return existing;

  const sandbox = await Sandbox.reconnect(sandboxId);
  const stored: StoredSandbox = {
    id: sandboxId,
    sandbox,
    createdAt: Date.now(),
    processes: new Map(),
  };
  sandboxes.set(sandboxId, stored);
  return stored;
}

export async function createSandbox(opts?: { timeout?: number }) {
  const sandboxOpts: SandboxOpts = {
    template: getTemplate(),
    timeout: opts?.timeout,
  };
  const sandbox = await Sandbox.create(sandboxOpts);
  const stored: StoredSandbox = {
    id: sandbox.id,
    sandbox,
    createdAt: Date.now(),
    processes: new Map(),
  };
  sandboxes.set(sandbox.id, stored);
  return stored.id;
}

export async function writeFile({
  sandboxId,
  path,
  content,
}: {
  sandboxId: string;
  path: string;
  content: string;
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  await stored.sandbox.filesystem.write(path, content);
}

export async function readFile({
  sandboxId,
  path,
}: {
  sandboxId: string;
  path: string;
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  return stored.sandbox.filesystem.read(path);
}

export async function runCommand({
  sandboxId,
  command,
  args = [],
}: {
  sandboxId: string;
  command: string;
  args?: string[];
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  const startedAt = Date.now();
  const logs: CommandLog[] = [];
  let processId = "";
  let resolveDone: () => void = () => {};
  const donePromise = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const proc = await stored.sandbox.process.start({
    cmd: [command, ...args].join(" "),
    onStdout: (msg) =>
      logs.push({
        data: msg.line,
        stream: "stdout",
        timestamp: Date.now(),
      }),
    onStderr: (msg) =>
      logs.push({
        data: msg.line,
        stream: "stderr",
        timestamp: Date.now(),
      }),
    onExit: (exitCode) => {
      const storedProc = processId
        ? stored.processes.get(processId)
        : undefined;
      if (storedProc) {
        storedProc.exitCode = typeof exitCode === "number" ? exitCode : 0;
      }
      resolveDone();
    },
  });

  processId = proc.processID;
  stored.processes.set(processId, {
    processId,
    command,
    args,
    logs,
    startedAt,
    wait: () => proc.wait(),
    listeners: new Set(),
    resolveDone,
    donePromise,
  });

  return { processId };
}

export async function waitForCommand({
  sandboxId,
  processId,
}: {
  sandboxId: string;
  processId: string;
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  const proc = stored.processes.get(processId);
  if (!proc) {
    return { exitCode: undefined, stdout: "", stderr: "" };
  }

  if (proc.exitCode !== undefined) {
    return {
      exitCode: proc.exitCode,
      stdout: collectStream(proc.logs, "stdout"),
      stderr: collectStream(proc.logs, "stderr"),
    };
  }

  // Prefer the original wait if available; otherwise wait for completion signal.
  let output:
    | {
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      }
    | undefined;

  if (proc.wait) {
    output = await proc.wait();
  } else {
    await proc.donePromise;
    output = {
      exitCode: proc.exitCode,
      stdout: collectStream(proc.logs, "stdout"),
      stderr: collectStream(proc.logs, "stderr"),
    };
  }

  proc.exitCode = output.exitCode ?? 0;
  return {
    exitCode: output.exitCode ?? 0,
    stdout: output.stdout,
    stderr: output.stderr,
  };
}

export async function getCommand({
  sandboxId,
  processId,
}: {
  sandboxId: string;
  processId: string;
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  const proc = stored.processes.get(processId);
  if (!proc) return null;
  return {
    sandboxId,
    cmdId: processId,
    startedAt: proc.startedAt,
    exitCode: proc.exitCode,
    command: proc.command,
    args: proc.args,
  };
}

export async function getCommandLogs({
  sandboxId,
  processId,
}: {
  sandboxId: string;
  processId: string;
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  const proc = stored.processes.get(processId);
  return proc?.logs ?? [];
}

export async function getCommandLogStream({
  sandboxId,
  processId,
}: {
  sandboxId: string;
  processId: string;
}) {
  const stored = await getOrReconnectSandbox(sandboxId);
  const proc = stored.processes.get(processId);
  if (!proc) {
    async function* empty() {
      return;
    }
    return empty();
  }

  async function* iterator() {
    // emit existing logs first
    for (const log of proc.logs) {
      yield log;
    }

    let finished = false;
    const queue: CommandLog[] = [];
    let resolveNext: (() => void) | null = null;

    const onLog = (log: CommandLog) => {
      queue.push(log);
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    };

    proc.listeners.add(onLog);

    proc.donePromise.then(() => {
      finished = true;
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    });

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift() as CommandLog;
          continue;
        }
        if (finished) break;
        await new Promise<void>((resolve) => {
          resolveNext = resolve;
        });
      }
    } finally {
      proc.listeners.delete(onLog);
    }
  }

  return iterator();
}

export function getSandboxUrl(_sandboxId: string, _port: number) {
  // E2B does not expose public URLs by default; return placeholder.
  return null;
}

export async function killSandbox(sandboxId: string) {
  const stored = sandboxes.get(sandboxId);
  if (stored) {
    await stored.sandbox.close();
    sandboxes.delete(sandboxId);
  }
}

function collectStream(logs: CommandLog[], stream: "stdout" | "stderr") {
  return logs
    .filter((l) => l.stream === stream)
    .map((l) => l.data)
    .join("\n");
}
