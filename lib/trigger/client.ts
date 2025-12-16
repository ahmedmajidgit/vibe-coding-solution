import { TriggerClient } from "@trigger.dev/sdk";

export const triggerClient = new TriggerClient({
  id: "vibe-app",
  apiKey: process.env.TRIGGER_SECRET_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
  logLevel: "info",
});
