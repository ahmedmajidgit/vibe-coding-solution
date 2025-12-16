# E2B Sandbox & Trigger.dev Integration

This project demonstrates how to manage ephemeral sandboxes using **E2B** and **Trigger.dev** jobs. It provides tools for creating sandboxes, running commands, and managing files in a structured AI workflow.

---

## Key Components

### `lib/executor/e2b.tsx`

Provides low-level sandbox management: create, reconnect, run commands, write/read files, and fetch logs. Handles both **local** and **Trigger.dev** execution modes.

### `lib/executor/provider.tsx`

Abstracts execution mode:

- **local** → runs directly using E2B SDK
- **trigger** → runs as Trigger.dev jobs for cloud execution and orchestration

### `ai/tools/*`

Tools exposed to AI workflows:

- `create-sandbox.ts` → spin up a sandbox
- `run-command.ts` → execute commands in sandbox
- `generate-files.ts` → generate and write files
- `get-sandbox-url.ts` → fetch sandbox URL (placeholder for E2B)

### `trigger/jobs/sandbox.ts`

Defines Trigger.dev jobs to run sandbox operations asynchronously in the cloud:

- `createSandboxJob`
- `runCommandJob`
- `writeFilesJob`
- `readFileJob`

### API Routes

Next.js routes expose sandbox operations for HTTP access:

- `/api/sandboxes/[sandboxId]` → health check
- `/api/sandboxes/[sandboxId]/cmd/[cmdId]` → command status
- `/api/sandboxes/[sandboxId]/cmd/[cmdId]/logs` → streaming logs
- `/api/sandboxes/[sandboxId]/files` → read sandbox files

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Execution backend

This project now uses E2B sandboxes orchestrated via Trigger.dev. Configure these env vars before running:

```
E2B_API_KEY=""
E2B_TEMPLATE="base" # optional
TRIGGER_SECRET_KEY=""
TRIGGER_API_URL=""   # optional, if self-hosted
EXECUTION_MODE="local" # set to "trigger" to route via Trigger.dev jobs
```
