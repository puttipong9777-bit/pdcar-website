import { createClient } from "@supabase/supabase-js";

const FILE_ID = /^FILE-[A-Za-z0-9-]{1,96}$/;

export type PublicVehicleImageMembership =
  | { status: "allowed" }
  | { status: "not_listed" }
  | { status: "unavailable" };

function timeoutMs() {
  const configured = Number(process.env.VEHICLE_MEDIA_MEMBERSHIP_TIMEOUT_MS);
  return Number.isFinite(configured) ? Math.min(5_000, Math.max(100, configured)) : 1_500;
}

// This performs one narrow, uncached public-view lookup. It intentionally does
// not load the full inventory and does not grant access from an in-process cache.
export async function getPublicVehicleImageMembership(fileId: string): Promise<PublicVehicleImageMembership> {
  if (!FILE_ID.test(fileId)) return { status: "not_listed" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: "unavailable" };

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: "no-store",
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs())])
          : AbortSignal.timeout(timeoutMs())
      })
    }
  });

  try {
    const response = await supabase
      .from("public_vehicle_listings")
      .select("car_id")
      .contains("photos", JSON.stringify([{ fileId }]))
      .limit(1);
    if (response.error) return { status: "unavailable" };
    return Array.isArray(response.data) && response.data.length > 0
      ? { status: "allowed" }
      : { status: "not_listed" };
  } catch {
    return { status: "unavailable" };
  }
}
