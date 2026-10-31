import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { PublicVehicleListing, PublicVehicleLookupResult, PublicVehiclePhoto, VehicleDataResult } from "@/lib/types";

type PublicVehicleRow = Record<string, unknown>;

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function cleanVehicleText(value: string) {
  const corrected = value.replace(/fortunner/gi, "Fortuner").replace(/\s+/g, " ").trim();
  return corrected
    .split(" ")
    .filter((token, index, tokens) => index === 0 || token.toLocaleLowerCase("en-US") !== tokens[index - 1].toLocaleLowerCase("en-US"))
    .join(" ");
}

function normalizedEnum(value: unknown, labels: Record<string, string>) {
  const original = text(value).trim();
  if (!original) return undefined;
  return labels[original.toLocaleLowerCase("en-US")] || original;
}

function fuelType(value: unknown) {
  return normalizedEnum(value, {
    gasoline: "เบนซิน",
    petrol: "เบนซิน",
    diesel: "ดีเซล",
    hybrid: "ไฮบริด",
    electric: "ไฟฟ้า",
    ev: "ไฟฟ้า",
    lpg: "LPG",
    ngv: "NGV"
  });
}

function transmission(value: unknown) {
  return normalizedEnum(value, {
    automatic: "อัตโนมัติ",
    auto: "อัตโนมัติ",
    at: "อัตโนมัติ",
    manual: "ธรรมดา",
    mt: "ธรรมดา",
    cvt: "CVT"
  });
}

function photos(value: unknown): PublicVehiclePhoto[] {
  if (!Array.isArray(value)) return [];
  const mediaUrl = (process.env.NEXT_PUBLIC_VEHICLE_IMAGE_BASE_URL || "https://www.pdcarcenter.com/media/vehicle-images").replace(/\/$/, "");
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const fileId = text(row.fileId);
    if (!fileId) return [];
    return [{
      fileId,
      url: `${mediaUrl}/${encodeURIComponent(fileId)}`,
      isPrimary: Boolean(row.isPrimary),
      sortOrder: Number(row.sortOrder ?? 0)
    }];
  }).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
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

function mapVehicle(row: PublicVehicleRow): PublicVehicleListing {
  const vehiclePhotos = photos(row.photos);
  const video = verticalVideo(row.vertical_video);
  const brand = cleanVehicleText(text(row.brand));
  const model = cleanVehicleText(text(row.model));
  const carId = text(row.car_id);
  const title = cleanVehicleText(text(row.website_title) || [brand, model, row.variant, row.year].filter(Boolean).join(" "));
  return {
    carId,
    slug: text(row.website_slug) || carId.toLowerCase(),
    status: row.status === "reserved" ? "reserved" : "available",
    brand,
    model,
    variant: cleanVehicleText(text(row.variant)) || undefined,
    year: Number(row.year ?? 0),
    color: text(row.color) || undefined,
    mileage: optionalNumber(row.mileage),
    fuelType: fuelType(row.fuel_type),
    transmission: transmission(row.transmission),
    conditionSummary: text(row.condition_summary) || undefined,
    salePrice: optionalNumber(row.sale_price),
    downPayment: optionalNumber(row.listing_down_payment),
    financeAmount: optionalNumber(row.listing_finance_amount),
    installment: optionalNumber(row.listing_installment),
    monthlyPayment: optionalNumber(row.listing_monthly_payment),
    title,
    description: text(row.public_description) || undefined,
    featured: Boolean(row.website_featured),
    coverImageUrl: vehiclePhotos[0]?.url,
    ...video,
    photos: vehiclePhotos,
    updatedAt: text(row.updated_at)
  };
}

async function fetchPublicVehicles(): Promise<VehicleDataResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configuredTimeout = Number(process.env.VEHICLE_DATA_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) ? Math.min(8_000, Math.max(100, configuredTimeout)) : 8_000;
  if (!url || !key) {
    return {
      vehicles: [],
      source: "not_configured",
      message: "โปรเจกต์พร้อมแล้ว เหลือเชื่อม Supabase Public View"
    };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: "no-store",
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
          : AbortSignal.timeout(timeoutMs)
      })
    }
  });

  let data: PublicVehicleRow[] | null = null;
  let error: unknown;
  try {
    const response = await supabase
      .from("public_vehicle_listings")
      .select("*")
      .order("website_featured", { ascending: false })
      .order("updated_at", { ascending: false });
    data = response.data as PublicVehicleRow[] | null;
    error = response.error;
  } catch (caught) {
    error = caught;
  }

  if (error) {
    return {
      vehicles: [],
      source: "view_not_ready",
      message: "ไม่สามารถเชื่อมต่อข้อมูลรถได้ชั่วคราว กรุณาลองใหม่อีกครั้ง"
    };
  }

  const vehicles = (data ?? []).flatMap((row) => {
    if ((row.status !== "available" && row.status !== "reserved") || !text(row.car_id)) return [];
    return [mapVehicle(row)];
  });
  return { vehicles, source: "supabase" };
}

// React request memoization keeps metadata and page rendering on one fresh inventory
// snapshot while still re-reading Supabase on the next HTTP request.
export const getPublicVehicles = cache(fetchPublicVehicles);

export async function getPublicVehicle(identifier: string): Promise<PublicVehicleLookupResult> {
  const result = await getPublicVehicles();
  if (result.source !== "supabase") {
    return {
      status: "unavailable",
      source: result.source,
      message: result.message || "ไม่สามารถเชื่อมต่อข้อมูลรถได้ชั่วคราว กรุณาลองใหม่อีกครั้ง"
    };
  }
  const vehicle = result.vehicles.find((item) => item.carId === identifier || item.slug === identifier);
  return vehicle ? { status: "found", vehicle, vehicles: result.vehicles } : { status: "not_found", vehicles: result.vehicles };
}

export class VehicleDataUnavailableError extends Error {
  constructor(message = "vehicle_data_unavailable") {
    super(message);
    this.name = "VehicleDataUnavailableError";
  }
}
