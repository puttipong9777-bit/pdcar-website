import type { PublicVehicleListing } from "@/lib/types";

const number = new Intl.NumberFormat("th-TH");

export function vehicleMetaDescription(vehicle: PublicVehicleListing) {
  const facts = [
    vehicle.status === "reserved" ? "สถานะติดจอง" : "สถานะพร้อมขาย",
    vehicle.salePrice !== undefined ? `ราคา ${number.format(vehicle.salePrice)} บาท` : undefined,
    vehicle.year > 0 ? `ปีรุ่น ${vehicle.year}` : undefined,
    vehicle.mileage !== undefined ? `เลขไมล์ ${number.format(vehicle.mileage)} กม.` : undefined
  ].filter(Boolean);
  const description = `${vehicle.title} (${vehicle.carId}) ${facts.join(" · ")} ดูรูปจริงและรายละเอียดจาก PD Car Center นครปฐม`;
  return Array.from(description).slice(0, 160).join("").trim();
}

export function relatedVehicles(vehicle: PublicVehicleListing, vehicles: PublicVehicleListing[], limit = 3) {
  return vehicles
    .filter((candidate) => candidate.carId !== vehicle.carId)
    .map((candidate, index) => ({
      candidate,
      index,
      score: Number(candidate.brand === vehicle.brand) * 2 + Number(candidate.status === "available")
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
