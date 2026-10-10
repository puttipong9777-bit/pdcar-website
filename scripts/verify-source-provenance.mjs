import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const manifest = JSON.parse(await readFile(new URL("../docs/VERCEL_SOURCE_RECOVERY.json", import.meta.url), "utf8"));
for (const entry of manifest.sourceFiles) {
  if (entry.path.startsWith("/") || entry.path.split("/").includes("..")) throw new Error("Unsafe source path");
  const bytes = await readFile(new URL("../" + entry.path, import.meta.url));
  const actual = createHash("sha1").update(bytes).digest("hex");
  if (actual !== entry.sha1) throw new Error("Recovered source hash mismatch: " + entry.path);
}
console.log("PASS: " + manifest.sourceFiles.length + " recovered source files match Vercel deployment identifiers.");
