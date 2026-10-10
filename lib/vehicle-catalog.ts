import type { PublicVehicleListing, PublicVehicleStatus } from "./types";

export type CatalogSort = "recommended" | "price-asc" | "price-desc" | "year-desc";
export type CatalogFilters = { query: string; brand: string; year: string; maxPrice: string; status: "all" | PublicVehicleStatus; sort: CatalogSort };
export const defaultCatalogFilters: CatalogFilters = { query: "", brand: "all", year: "all", maxPrice: "all", status: "all", sort: "recommended" };

export function getCatalogPhotos(vehicle: PublicVehicleListing): string[] {
  return Array.from(new Set([vehicle.coverImageUrl, ...vehicle.photos.map((photo) => photo.url)].filter((url): url is string => Boolean(url))));
}

export function filterCatalog(vehicles: PublicVehicleListing[], filters: CatalogFilters): PublicVehicleListing[] {
  const needle = filters.query.trim().toLocaleLowerCase("th-TH");
  const filtered = vehicles.filter((vehicle) => {
    const haystack = [vehicle.carId, vehicle.title, vehicle.brand, vehicle.model, vehicle.variant, vehicle.year].filter(Boolean).join(" ").toLocaleLowerCase("th-TH");
    return (filters.status === "all" || vehicle.status === filters.status)
      && (filters.brand === "all" || vehicle.brand === filters.brand)
      && (filters.year === "all" || String(vehicle.year) === filters.year)
      && (filters.maxPrice === "all" || (vehicle.salePrice !== undefined && vehicle.salePrice <= Number(filters.maxPrice)))
      && (!needle || haystack.includes(needle));
  });
  return filtered.sort((a, b) => {
    if (filters.sort === "year-desc") return b.year - a.year;
    if (filters.sort === "price-asc" || filters.sort === "price-desc") {
      if (a.salePrice === undefined) return b.salePrice === undefined ? 0 : 1;
      if (b.salePrice === undefined) return -1;
      return filters.sort === "price-asc" ? a.salePrice - b.salePrice : b.salePrice - a.salePrice;
    }
    return 0; // Keep the ERP's featured/latest order without mutating source data.
  });
}
