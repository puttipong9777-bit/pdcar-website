import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Public inventory is rendered per request; no R2/D1 cache resources are needed.
export default defineCloudflareConfig();
