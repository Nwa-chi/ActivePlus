import { readSession } from "@/app/lib/auth";
import { ensureSchema } from "@/app/lib/database";
import { createStripeCheckout, Place, routeQuote } from "@/app/lib/services";

export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const db = await ensureSchema();
  const result = await db.prepare("SELECT id, status, pickup_name AS pickupName, dropoff_name AS dropoffName, fare_cents AS fareCents, created_at AS createdAt FROM rides WHERE rider_id = ? ORDER BY created_at DESC LIMIT 20").bind(session.userId).all();
  return Response.json({ rides: result.results });
}

export async function POST(request: Request) {
  try {
    const session = await readSession(request);
    if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
    const { pickup, dropoff } = await request.json() as { pickup: Place; dropoff: Place };
    if (!pickup || !dropoff) throw new Error("Pickup and destination are required");
    const quote = await routeQuote(pickup, dropoff);
    const db = await ensureSchema();
    const id = `AP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();
    await db.prepare("INSERT INTO rides (id, rider_id, status, pickup_name, pickup_lng_e6, pickup_lat_e6, dropoff_name, dropoff_lng_e6, dropoff_lat_e6, distance_meters, duration_seconds, fare_cents, created_at, updated_at) VALUES (?, ?, 'payment_pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, session.userId, pickup.name, Math.round(pickup.longitude * 1e6), Math.round(pickup.latitude * 1e6), dropoff.name, Math.round(dropoff.longitude * 1e6), Math.round(dropoff.latitude * 1e6), quote.distanceMeters, quote.durationSeconds, quote.fareCents, now, now).run();
    const checkout = await createStripeCheckout({ id, fareCents: quote.fareCents, pickupName: pickup.name, dropoffName: dropoff.name }, new URL(request.url).origin);
    await db.prepare("UPDATE rides SET stripe_session_id = ?, updated_at = ? WHERE id = ?").bind(checkout.id, Date.now(), id).run();
    return Response.json({ rideId: id, checkoutUrl: checkout.url });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Ride booking failed" }, { status: 400 }); }
}
