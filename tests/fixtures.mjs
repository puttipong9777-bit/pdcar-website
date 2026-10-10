export const publicKey = `e30.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.mock`;
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey,
  NEXT_PUBLIC_ERP_URL: "https://media.example.test",
  NEXT_PUBLIC_SHOP_PHONE: "0840079122",
  NEXT_PUBLIC_LINE_URL: "https://line.me/ti/p/mock"
};
export const car = (overrides = {}) => ({
  car_id: "PD0001", status: "available", brand: "Toyota", model: "Yaris", variant: "AT", year: 2022,
  website_slug: "toyota-yaris-2022", website_title: "Toyota Yaris 2022", website_featured: true,
  sale_price: 399000, listing_down_payment: 39000, listing_finance_amount: 360000,
  listing_installment: 72, listing_monthly_payment: 6900, mileage: 23000, fuel_type: "เบนซิน", transmission: "อัตโนมัติ",
  public_description: "รถทดสอบจำลองเท่านั้น", updated_at: "2026-10-10T00:00:00Z",
  photos: [{ fileId: "mock-front", isPrimary: true, sortOrder: 0 }, { fileId: "mock-side", isPrimary: false, sortOrder: 1 }],
  vertical_video: { youtubeVideoId: "mockvideo01", youtubeUrl: "https://www.youtube.com/shorts/mockvideo01", caption: "Mock clip" },
  ...overrides
});
