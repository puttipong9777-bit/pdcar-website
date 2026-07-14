export async function GET() {
  return Response.json({ status: "ok", service: "pdcar-website", timestamp: new Date().toISOString() });
}
