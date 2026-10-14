import { imageResponse, vehicleImagesBucket } from "@/lib/cloudflare-media";

export const dynamic = "force-dynamic";

const slots = {
  logo: { key: "site/logo.webp", fallback: "/images/pd-logo.jpg" },
  storefront: { key: "site/storefront.webp", fallback: "/images/storefront.jpg" }
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  const selected = slots[slot as keyof typeof slots];
  if (!selected) return new Response("Image not found", { status: 404 });
  const object = await (await vehicleImagesBucket())?.get(selected.key);
  if (object) return imageResponse(object);
  const fallback = new URL(selected.fallback, request.url);
  return Response.redirect(fallback, 307);
}
