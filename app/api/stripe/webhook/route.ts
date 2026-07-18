import { confirmRidePayment } from "@/app/lib/database";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const body = await request.text();
  const header = request.headers.get("stripe-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300 || !safeEqual(await hmacHex(secret, `${parts.t}.${body}`), parts.v1)) return new Response("Invalid signature", { status: 400 });
  const event = JSON.parse(body) as { type: string; data?: { object?: { id?: string; payment_status?: string; metadata?: { ride_id?: string } } } };
  if (event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid" && event.data.object.metadata?.ride_id) {
    await confirmRidePayment(event.data.object.metadata.ride_id, event.data.object.id ?? null);
  }
  return Response.json({ received: true });
}
