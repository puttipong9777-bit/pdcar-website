export type ArticleStatus = "generating" | "failed" | "pending" | "published" | "rejected" | "unpublished" | "deleted";
export type Decision = "approve" | "reject" | "unpublish" | "republish" | "delete";
export type ArticleContent = {
  title: string;
  description: string;
  sections: { heading: string; paragraphs: string[]; factIds: string[] }[];
};
export type ArticleSource = { id: string; title: string; url: string; facts: { id: string; text: string }[] };
export type Article = {
  id: string; article_date: string; slug: string; status: ArticleStatus;
  content: ArticleContent | null; sources: ArticleSource[]; version: number;
  published_at: string | null; updated_at: string; created_at: string;
};
export const statusLabels: Record<ArticleStatus, string> = {
  generating: "กำลังสร้างร่าง", failed: "สร้างร่างไม่สำเร็จ", pending: "รออนุมัติ",
  published: "เผยแพร่แล้ว", rejected: "ไม่อนุมัติ", unpublished: "ยกเลิกเผยแพร่", deleted: "ลบแล้ว",
};
export function thaiDate(value: string) {
  return new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value)
    .toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" });
}
