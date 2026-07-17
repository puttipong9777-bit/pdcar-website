import { createClient } from "@supabase/supabase-js";
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

function photos(value: unknown): PublicVehiclePhoto[] {
  if (!Array.isArray(value)) return [];
  const erpUrl = (process.env.NEXT_PUBLIC_ERP_URL || "https://pdcar-platform.vercel.app").replace(/\/$/, "");
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

function mapVehicle(row: PublicVehicleRow): PublicVehicleListing {
  const vehiclePhotos = photos(row.photos);
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

export async function getPublicVehicles(): Promise<VehicleDataResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      vehicles: [],
      source: "not_configured",
      message: "โปรเจกต์พร้อมแล้ว เหลือเชื่อม Supabase Public View"
    };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("public_vehicle_listings")
    .select("*")
    .order("website_featured", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      vehicles: [],
      source: "view_not_ready",
      message: "ไม่สามารถเชื่อมต่อข้อมูลรถได้ชั่วคราว กรุณาลองใหม่อีกครั้ง"
    };
  }

  return { vehicles: (data ?? []).map(mapVehicle), source: "supabase" };
}

export async function getPublicVehicle(identifier: string) {
  const result = await getPublicVehicles();
  return result.vehicles.find((vehicle) => vehicle.carId === identifier || vehicle.slug === identifier) ?? null;
}
