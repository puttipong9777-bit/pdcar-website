import type { PublicVehicleListing } from "@/lib/types";

const catalogColumns = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "quantity_to_sell_on_facebook"
] as const;

function cleanText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function catalogVehicleRows(vehicles: PublicVehicleListing[]) {
  return vehicles.flatMap((vehicle) => {
    if (!vehicle.coverImageUrl || !vehicle.salePrice || vehicle.salePrice <= 0) return [];
    const link = `https://www.pdcarcenter.com/cars/${encodeURIComponent(vehicle.slug)}`;
    const description = cleanText(
      vehicle.description || `${vehicle.title} รถมือสองจาก PD Car Center นครปฐม`,
      5000
    );
    const additionalImages = vehicle.photos
      .map((photo) => photo.url)
      .filter((url) => url !== vehicle.coverImageUrl)
      .slice(0, 20)
      .join(",");

    return [{
      id: cleanText(vehicle.carId, 100),
      title: cleanText(vehicle.title, 150),
      description,
      availability: vehicle.status === "available" ? "in stock" : "out of stock",
      condition: "used",
      price: `${vehicle.salePrice.toFixed(2)} THB`,
      link,
      image_link: vehicle.coverImageUrl,
      additional_image_link: additionalImages,
      brand: cleanText(vehicle.brand || "PD Car Center", 100),
      quantity_to_sell_on_facebook: vehicle.status === "available" ? "1" : "0"
    }];
  });
}

export function createMetaCatalogCsv(vehicles: PublicVehicleListing[]) {
  const rows = catalogVehicleRows(vehicles);
  const lines = [
    catalogColumns.join(","),
    ...rows.map((row) => catalogColumns.map((column) => csvCell(row[column])).join(","))
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
