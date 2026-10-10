import type { PublicVehicleListing, PublicVehiclePhoto, VehicleDataResult } from "@/lib/types";

type PublicVehicleRow = Record<string, unknown>;

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function photos(value: unknown, erpOrigin?: string): PublicVehiclePhoto[] {
  if (!Array.isArray(value)) return [];
  const erpUrl = (erpOrigin || process.env.NEXT_PUBLIC_ERP_URL || "https://pdcar-platform.vercel.app").replace(/\/$/, "");
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const fileId = text(row.fileId);
    if (!fileId) return [];
    return [{
      fileId,
      url: `${erpUrl}/api/public/vehicle-images/${encodeURIComponent(fileId)}`,
      isPrimary: Boolean(row.isPrimary),
      sortOrder: Number(row.sortOrder ?? 0)
    }];
  });
}

function verticalVideo(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  return {
    youtubeVideoId: text(row.youtubeVideoId) || undefined,
    youtubeVideoUrl: text(row.youtubeUrl) || undefined,
    videoCaption: text(row.caption) || undefined
  };
}

function mapVehicle(row: PublicVehicleRow, erpOrigin?: string): PublicVehicleListing {
  const vehiclePhotos = photos(row.photos, erpOrigin);
  const video = verticalVideo(row.vertical_video);
  const brand = text(row.brand);
  const model = text(row.model);
  const carId = text(row.car_id);
  return {
    carId,
    slug: text(row.website_slug) || carId.toLowerCase(),
    status: row.status === "reserved" ? "reserved" : "available",
    brand,
    model,
    variant: text(row.variant) || undefined,
    year: Number(row.year ?? 0),
    color: text(row.color) || undefined,
    mileage: optionalNumber(row.mileage),
    fuelType: text(row.fuel_type) || undefined,
    transmission: text(row.transmission) || undefined,
    conditionSummary: text(row.condition_summary) || undefined,
    salePrice: optionalNumber(row.sale_price),
    downPayment: optionalNumber(row.listing_down_payment),
    financeAmount: optionalNumber(row.listing_finance_amount),
    installment: optionalNumber(row.listing_installment),
    monthlyPayment: optionalNumber(row.listing_monthly_payment),
    title: text(row.website_title) || [brand, model, row.variant, row.year].filter(Boolean).join(" "),
    description: text(row.public_description) || undefined,
    featured: Boolean(row.website_featured),
    coverImageUrl: vehiclePhotos[0]?.url,
    ...video,
    photos: vehiclePhotos,
    updatedAt: text(row.updated_at)
  };
}

export async function getPublicVehicles(env: Record<string, string | undefined> = process.env, identifier?: string): Promise<VehicleDataResult> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      vehicles: [],
      source: "not_configured",
      message: "โปรเจกต์พร้อมแล้ว เหลือเชื่อม Supabase Public View"
    };
  }

  try {
    if (!isPublicKey(key)) throw new Error("Only an anonymous/public key is permitted");
    const endpoint = new URL("/rest/v1/public_vehicle_listings", url);
    endpoint.searchParams.set("select", PUBLIC_COLUMNS.join(","));
    endpoint.searchParams.set("status", "in.(available,reserved)");
    if (identifier !== undefined) {
      // PostgREST quoted literals prevent slugs containing punctuation from
      // changing the filter grammar. URLSearchParams handles URL encoding.
      const literal = `"${identifier.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      endpoint.searchParams.set("or", `(car_id.eq.${literal},website_slug.eq.${literal})`);
    }
    endpoint.searchParams.set("order", "website_featured.desc,updated_at.desc,car_id.asc");
    const rows: PublicVehicleRow[] = [];
    // Explicit paging avoids silently truncating stock at the PostgREST row cap.
    const pageSize = 100;
    for (let page = 0; page < 40; page++) {
      endpoint.searchParams.set("limit", String(pageSize));
      endpoint.searchParams.set("offset", String(page * pageSize));
      const read = () => fetch(endpoint, {
        method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: key, ...(key.startsWith("sb_publishable_") ? {} : { Authorization: `Bearer ${key}` }) }
      });
      let response = await read();
      if (!response.ok && page === 0 && response.status === 400) {
        const error = await response.clone().json().catch(() => null);
        // Older approved views predate the optional YouTube field. Only this
        // precise missing-column error may drop it; never widen to select(*).
        if (error?.code === "42703" && /\bvertical_video\b/.test(String(error.message))) {
          endpoint.searchParams.set("select", PUBLIC_COLUMNS.filter((column) => column !== "vertical_video").join(","));
          response = await read();
        }
      }
      if (!response.ok) throw new Error("Public view unavailable");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid public view response");
      rows.push(...data);
      if (data.length < pageSize) {
        return { vehicles: rows.filter((row) => row.status === "available" || row.status === "reserved")
          .map((row) => mapVehicle(row, env.NEXT_PUBLIC_ERP_URL)), source: "supabase" };
      }
    }
    // Fail visibly rather than publishing a silently incomplete inventory/sitemap.
    throw new Error("Inventory exceeds request budget");
  } catch {
    return { vehicles: [], source: "view_not_ready", message: "ไม่สามารถเชื่อมต่อข้อมูลรถได้ชั่วคราว กรุณาลองใหม่อีกครั้ง" };
  }
}

export const PUBLIC_COLUMNS = [
  "car_id", "status", "brand", "model", "variant", "year", "color", "mileage", "fuel_type",
  "transmission", "condition_summary", "sale_price", "listing_down_payment", "listing_finance_amount",
  "listing_installment", "listing_monthly_payment", "public_description", "website_title", "website_slug",
  "website_featured", "photos", "vertical_video", "updated_at"
];

export function isPublicKey(key: string) {
  if (key.startsWith("sb_publishable_")) return true;
  try {
    const payload = key.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return claims.role === "anon";
  } catch { return false; }
}

export async function getPublicVehicle(identifier: string) {
  const result = await getPublicVehicles(process.env, identifier);
  return result.vehicles.find((vehicle) => vehicle.carId === identifier || vehicle.slug === identifier) ?? null;
}
