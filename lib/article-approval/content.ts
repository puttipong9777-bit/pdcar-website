import type { ArticleContent, ArticleSource } from "./types";
import { ArticleError } from "./security";

export const contentSchema = {
  type: "object", additionalProperties: false, required: ["title", "description", "sections"],
  properties: {
    title: { type: "string" }, description: { type: "string" },
    sections: { type: "array", items: {
      type: "object", additionalProperties: false, required: ["heading", "paragraphs", "factIds"],
      properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } }, factIds: { type: "array", items: { type: "string" } } },
    } },
  },
};
export function validateContent(value: unknown, sources: ArticleSource[]): ArticleContent {
  if (!value || typeof value !== "object") throw new ArticleError("invalid_content");
  const c = value as ArticleContent;
  const validText = (s: unknown, min: number, max: number) => typeof s === "string" && s.trim().length >= min && s.length <= max && /[ก-๙]/.test(s);
  if (!validText(c.title, 10, 140) || !validText(c.description, 30, 220) || !Array.isArray(c.sections) || c.sections.length < 3 || c.sections.length > 5) throw new ArticleError("invalid_content");
  const factIds = new Set(sources.flatMap((s) => s.facts.map((f) => f.id)));
  for (const section of c.sections) {
    if (!section || !validText(section.heading, 3, 100) || !Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.length > 2 || section.paragraphs.some((p) => !validText(p, 30, 600)) || !Array.isArray(section.factIds) || !section.factIds.length || section.factIds.some((id) => !factIds.has(id))) throw new ArticleError("invalid_content");
  }
  const text = [c.title, c.description, ...c.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join("\n");
  if (text.length > 6500 || /[<>]|https?:|www\.|การันตี|รับประกัน.{0,20}(ผ่าน|กำไร|ผลตอบแทน)|อนุมัติแน่นอน|ปลอดภัย\s*100|ดีที่สุด|ถูกที่สุด|งานวิจัย|จากสถิติ|\d+\s*%/.test(text)) throw new ArticleError("unsafe_content");
  return c;
}
