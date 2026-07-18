import { readSession } from "@/app/lib/auth";
import { attachStripeSession, createRide, listRidesForUser } from "@/app/lib/database";
import { createStripeCheckout, Place, routeQuote } from "@/app/lib/services";

export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const rides = await listRidesForUser(session.userId);
  return Response.json({ rides: rides.map(({ id, status, pickupName, dropoffName, fareCents, createdAt }) => ({ id, status, pickupName, dropoffName, fareCents, createdAt })) });
}

export async function POST(request: Request) {
  try {
    const session = await readSession(request);
    if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
    const { pickup, dropoff } = await request.json() as { pickup: Place; dropoff: Place };
    if (!pickup || !dropoff) throw new Error("Pickup and destination are required");
    const quote = await routeQuote(pickup, dropoff);
    const id = `AP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();
    await createRide({ id, riderId: session.userId, status: "payment_pending", pickupName: pickup.name, pickupLng: pickup.longitude, pickupLat: pickup.latitude, dropoffName: dropoff.name, dropoffLng: dropoff.longitude, dropoffLat: dropoff.latitude, distanceMeters: quote.distanceMeters, durationSeconds: quote.durationSeconds, fareCents: quote.fareCents, stripeSessionId: null, createdAt: now, updatedAt: now });
    const checkout = await createStripeCheckout({ id, fareCents: quote.fareCents, pickupName: pickup.name, dropoffName: dropoff.name }, new URL(request.url).origin);
    await attachStripeSession(id, checkout.id);
    return Response.json({ rideId: id, checkoutUrl: checkout.url });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Ride booking failed" }, { status: 400 }); }
}
