import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type VehicleImageObject = {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  size: number;
  writeHttpMetadata(headers: Headers): void;
};

type PutOptions = { httpMetadata: { contentType: string; cacheControl: string }; customMetadata?: Record<string, string> };
export type VehicleImagesBucket = {
  get(key: string): Promise<VehicleImageObject | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: PutOptions): Promise<unknown>;
};

export async function vehicleImagesBucket() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as CloudflareEnv & { VEHICLE_IMAGES?: VehicleImagesBucket }).VEHICLE_IMAGES;
  } catch {
    return undefined;
  }
}

export function imageResponse(object: VehicleImageObject) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "image/webp");
  headers.set("Content-Length", String(object.size));
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  return new Response(object.body, { headers });
}
