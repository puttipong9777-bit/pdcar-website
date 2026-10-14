import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const catalogUrl = process.env.PDCAR_CATALOG_URL || "https://www.pdcarcenter.com/api/meta/catalog-feed";
const erpOrigin = (process.env.PDCAR_ERP_URL || "https://pdcar-erp-history.onrender.com").replace(/\/$/, "");
const outputDirectory = path.resolve(process.env.PDCAR_IMAGE_OUTPUT || "artifacts/r2-vehicle-images");
const concurrency = Math.max(1, Math.min(6, Number(process.env.PDCAR_IMAGE_CONCURRENCY || 4)));

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function existingSize(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

const catalogResponse = await fetchWithRetry(catalogUrl);
const catalog = await catalogResponse.text();
const fileIds = [...new Set(catalog.match(/FILE-[A-Za-z0-9-]+/g) || [])];
if (!fileIds.length) throw new Error("No public vehicle image IDs were found in the catalog feed.");

await mkdir(outputDirectory, { recursive: true });
sharp.concurrency(2);

const results = [];
let completed = 0;

async function prepare(fileId) {
  const destination = path.join(outputDirectory, `${fileId}.webp`);
  const cachedBytes = await existingSize(destination);
  if (cachedBytes > 0) return { fileId, outputBytes: cachedBytes, cached: true };

  const response = await fetchWithRetry(`${erpOrigin}/api/public/vehicle-images/${encodeURIComponent(fileId)}`);
  const source = Buffer.from(await response.arrayBuffer());
  const output = await sharp(source)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4, smartSubsample: true })
    .toBuffer();

  await writeFile(destination, output);
  return { fileId, sourceBytes: source.length, outputBytes: output.length, cached: false };
}

for (let index = 0; index < fileIds.length; index += concurrency) {
  const batch = fileIds.slice(index, index + concurrency);
  const batchResults = await Promise.all(batch.map(prepare));
  results.push(...batchResults);
  completed += batchResults.length;
  console.log(`Prepared ${completed}/${fileIds.length} images`);
}

const sourceBytes = results.reduce((sum, item) => sum + (item.sourceBytes || 0), 0);
const outputBytes = results.reduce((sum, item) => sum + item.outputBytes, 0);
const manifest = {
  generatedAt: new Date().toISOString(),
  catalogUrl,
  imageCount: results.length,
  downloadedSourceBytes: sourceBytes,
  outputBytes,
  width: 1200,
  format: "webp",
  quality: 78,
  files: results
};

await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ imageCount: results.length, sourceBytes, outputBytes, outputDirectory }));
