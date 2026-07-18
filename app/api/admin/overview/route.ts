import { forbidden, requireAdminApi } from "@/app/lib/admin";
import { ensureSchema } from "@/app/lib/database";

export const dynamic = "force-dynamic";

const maskPhone = (phone: string) => phone.length > 7 ? `${phone.slice(0, 5)}••••${phone.slice(-3)}` : "••••••";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return forbidden();
  const db = await ensureSchema();
  const [summary, statusRows, rides, customers, audits] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS totalRides, COUNT(DISTINCT rider_id) AS activeCustomers, COALESCE(SUM(CASE WHEN status IN ('requested','matched','driver_arriving','in_progress','completed') THEN fare_cents ELSE 0 END),0) AS grossCents, COALESCE(AVG(duration_seconds),0) AS avgDuration FROM rides`).first(),
    db.prepare("SELECT status, COUNT(*) AS count FROM rides GROUP BY status").all(),
    db.prepare(`SELECT r.id, r.status, r.pickup_name AS pickupName, r.dropoff_name AS dropoffName, r.distance_meters AS distanceMeters, r.duration_seconds AS durationSeconds, r.fare_cents AS fareCents, r.stripe_session_id AS stripeSessionId, r.created_at AS createdAt, r.updated_at AS updatedAt, u.phone AS riderPhone FROM rides r JOIN users u ON u.id = r.rider_id ORDER BY r.created_at DESC LIMIT 100`).all(),
    db.prepare(`SELECT u.id, u.phone, u.role, u.name, u.created_at AS createdAt, COUNT(r.id) AS rideCount, COALESCE(SUM(CASE WHEN r.status IN ('requested','matched','driver_arriving','in_progress','completed') THEN r.fare_cents ELSE 0 END),0) AS spendCents FROM users u LEFT JOIN rides r ON r.rider_id = u.id GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100`).all(),
    db.prepare("SELECT id, actor_email AS actorEmail, action, entity_type AS entityType, entity_id AS entityId, detail, created_at AS createdAt FROM admin_audit ORDER BY created_at DESC LIMIT 30").all(),
  ]);
  const providerHealth = { database: true, phoneVerification: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID), navigation: Boolean(process.env.MAPBOX_ACCESS_TOKEN), payments: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) };
  return Response.json({
    admin: { name: admin.displayName, email: admin.email }, summary: summary ?? {}, statuses: statusRows.results,
    rides: rides.results.map((ride) => ({ ...ride, riderPhone: maskPhone(String(ride.riderPhone)) })),
    customers: customers.results.map((customer) => ({ ...customer, phone: maskPhone(String(customer.phone)) })), audits: audits.results, providerHealth,
  }, { headers: { "Cache-Control": "no-store" } });
}
