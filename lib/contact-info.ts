export const publicLineOaId = "@pdcar";
export const defaultPublicLineUrl = "https://line.me/R/ti/p/%40pdcar";

export function getPublicLineUrl() {
  const configured = process.env.NEXT_PUBLIC_LINE_URL?.trim();
  if (!configured) return defaultPublicLineUrl;

  try {
    const url = new URL(configured);
    return url.protocol === "https:" ? url.toString() : defaultPublicLineUrl;
  } catch {
    return defaultPublicLineUrl;
  }
}
