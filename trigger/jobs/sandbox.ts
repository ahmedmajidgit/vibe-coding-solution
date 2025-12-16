import { z } from "zod";
// import { invokeTrigger } from "@trigger.dev/sdk/triggers";
import { invokeTrigger } from "@trigger.dev/sdk";
import { triggerClient } from "@/lib/trigger/client";
import {
  createSandbox as createSandboxLocal,
  runCommand as runCommandLocal,
  waitForCommand,
  writeFile as writeFileLocal,
  readFile as readFileLocal,
} from "@/lib/executor/e2b";

export const createSandboxJob = triggerClient.defineJob({
  id: "create-sandbox-e2b",
  name: "Create E2B Sandbox",
  version: "1.0.0",
  trigger: invokeTrigger(),
  run: async () => {
    const sandboxId = await createSandboxLocal();
    return { sandboxId };
  },
});

export const runCommandJob = triggerClient.defineJob({
  id: "run-command-e2b",
  name: "Run command in E2B",
  version: "1.0.0",
  trigger: invokeTrigger({
    schema: z.object({
      sandboxId: z.string(),
      command: z.string(),
      args: z.array(z.string()).optional(),
    }),
  }),
  run: async (payload) => {
    const { processId } = await runCommandLocal({
      sandboxId: payload.sandboxId,
      command: payload.command,
      args: payload.args,
    });
    const result = await waitForCommand({
      sandboxId: payload.sandboxId,
      processId,
    });
    return {
      cmdId: processId,
      ...result,
    };
  },
});

export const writeFilesJob = triggerClient.defineJob({
  id: "write-files-e2b",
  name: "Write files to E2B",
  version: "1.0.0",
  trigger: invokeTrigger({
    schema: z.object({
      sandboxId: z.string(),
      files: z.array(
        z.object({
          path: z.string(),
          content: z.string(),
        })
      ),
    }),
  }),
  run: async (payload) => {
    for (const file of payload.files) {
      await writeFileLocal({
        sandboxId: payload.sandboxId,
        path: file.path,
        content: file.content,
      });
    }
    return { paths: payload.files.map((f) => f.path) };
  },
});

export const readFileJob = triggerClient.defineJob({
  id: "read-file-e2b",
  name: "Read file from E2B",
  version: "1.0.0",
  trigger: invokeTrigger({
    schema: z.object({
      sandboxId: z.string(),
      path: z.string(),
    }),
  }),
  run: async (payload) => {
    const content = await readFileLocal({
      sandboxId: payload.sandboxId,
      path: payload.path,
    });
    return { content };
  },
});
