import { audit, forbidden, requireAdminApi } from "@/app/lib/admin";
import { ensureSchema } from "@/app/lib/database";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(); if (!admin) return forbidden();
  try {
    const { id } = await context.params; const { reason } = await request.json() as { reason?: string };
    if (!reason || reason.trim().length < 8) throw new Error("A refund reason of at least 8 characters is required");
    const secret = process.env.STRIPE_SECRET_KEY; if (!secret) throw new Error("Stripe is not configured");
    const db = await ensureSchema();
    const ride = await db.prepare("SELECT id, status, stripe_session_id AS stripeSessionId, fare_cents AS fareCents FROM rides WHERE id = ?").bind(id).first<{ id: string; status: string; stripeSessionId: string | null; fareCents: number }>();
    if (!ride?.stripeSessionId) return Response.json({ error: "No Stripe payment is attached to this ride" }, { status: 409 });
    if (["payment_pending", "refunded"].includes(ride.status)) return Response.json({ error: `A ${ride.status.replace("_", " ")} ride cannot be refunded` }, { status: 409 });
    const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(ride.stripeSessionId)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const session = await sessionResponse.json() as { payment_intent?: string; error?: { message?: string } };
    if (!sessionResponse.ok || !session.payment_intent) throw new Error(session.error?.message || "Paid Stripe intent was not found");
    const body = new URLSearchParams({ payment_intent: session.payment_intent, reason: "requested_by_customer", "metadata[ride_id]": id, "metadata[admin_reason]": reason.slice(0, 450) });
    const refundResponse = await fetch("https://api.stripe.com/v1/refunds", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `activeplus-refund-${id}` }, body });
    const refund = await refundResponse.json() as { id?: string; status?: string; error?: { message?: string } };
    if (!refundResponse.ok || !refund.id) throw new Error(refund.error?.message || "Stripe refund failed");
    const now = Date.now();
    await db.batch([
      db.prepare("UPDATE rides SET status = 'refunded', updated_at = ? WHERE id = ?").bind(now, id),
      db.prepare("INSERT INTO ride_events (id, ride_id, type, detail, created_at) VALUES (?, ?, 'refunded', ?, ?)").bind(crypto.randomUUID(), id, JSON.stringify({ refundId: refund.id, reason: reason.slice(0, 500) }), now),
    ]);
    await audit(admin.email, "ride.refunded", "ride", id, { refundId: refund.id, amountCents: ride.fareCents, reason: reason.slice(0, 500) });
    return Response.json({ ok: true, refundId: refund.id, status: refund.status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Refund failed" }, { status: 400 }); }
}
