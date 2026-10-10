import type { PageData } from "./app";
import type { compileTemplates } from "./prerender";
import { price, number } from "@/lib/format";

declare const __PDCAR_TEMPLATES__: ReturnType<typeof compileTemplates>;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[char]!);
// Match React's javascript: URL protection when replacing an attribute token.
function urlAttribute(value: string) {
  const blocked = value.replace(/[\u0000-\u0020]/g, "").toLowerCase().startsWith("javascript:");
  return escapeHtml(blocked ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : value);
}
function fill(template: string, slots: Record<string, string>) {
  // Replacement is deliberately one-pass: public text resembling a marker is
  // never treated as a second template, and all public leaf values are escaped.
  return template.replace(/__PDCAR_DYNAMIC_([A-Z_]+)__/g, (_, name: string) => slots[name]);
}

export function renderHome(data: PageData) {
  const t = __PDCAR_TEMPLATES__;
  const vehicles = data.result.vehicles;
  const brands = Array.from(new Set(vehicles.map((v) => v.brand).filter(Boolean))).sort();
  const years = Array.from(new Set(vehicles.map((v) => v.year))).sort((a, b) => b - a);
  const cards: string[] = [], stories: string[] = [];
  vehicles.forEach((vehicle, index) => {
    const fields: Record<string, string> = {
      ID: escapeHtml(vehicle.carId), TITLE: escapeHtml(vehicle.title),
      SLUG: escapeHtml(encodeURIComponent(vehicle.slug)),
      COVER: urlAttribute(vehicle.coverImageUrl || ""),
      VIDEO: escapeHtml(encodeURIComponent(vehicle.youtubeVideoId || "")),
      INDEX: String(index + 1).padStart(2, "0"),
      STATUS: vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย", STATUS_CLASS: vehicle.status
    };
    cards.push(fill(t.card, {
      ...fields,
      IMAGE: vehicle.coverImageUrl ? fill(t.image, fields) : t.placeholder,
      MILEAGE: vehicle.mileage !== undefined ? fill(t.mileage, { VALUE: number.format(vehicle.mileage) }) : "",
      FUEL: vehicle.fuelType ? fill(t.meta, { VALUE: escapeHtml(vehicle.fuelType) }) : "",
      TRANSMISSION: vehicle.transmission ? fill(t.meta, { VALUE: escapeHtml(vehicle.transmission) }) : "",
      PRICE: vehicle.salePrice !== undefined ? price.format(vehicle.salePrice) : "สอบถามราคา",
      MONTHLY: vehicle.monthlyPayment !== undefined ? fill(t.monthly, { VALUE: price.format(vehicle.monthlyPayment) }) : ""
    }));
    stories.push(fill(vehicle.youtubeVideoId ? t.storyVideo : vehicle.coverImageUrl ? t.storyImage : t.storyEmpty, fields));
  });
  const slots: Record<string, string> = {
    COUNT: String(vehicles.length), PHONE: escapeHtml(data.phone), LINE: urlAttribute(data.lineUrl || ""), NOTICE: "",
    INVENTORY: fill(t.browser, {
      BRANDS: brands.map((value) => fill(t.option, { VALUE: escapeHtml(value) })).join(""),
      YEARS: years.map((value) => fill(t.option, { VALUE: String(value) })).join(""),
      RESULTS: vehicles.length ? fill(t.grid, { CARDS: cards.join("") }) : t.empty
    }),
    STORIES: vehicles.length ? fill(t.stories, { STORIES: stories.join("") }) : t.emptyStories
  };
  return t.home[data.lineUrl ? 1 : 0].replace(/__PDCAR_STATIC_(COUNT|INVENTORY|STORIES|NOTICE|PHONE|LINE)__/g, (_, name: string) => slots[name]);
}
