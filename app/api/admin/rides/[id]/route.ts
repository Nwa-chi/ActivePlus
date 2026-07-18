import { audit, forbidden, requireAdminApi } from "@/app/lib/admin";
import { ensureSchema } from "@/app/lib/database";

export const dynamic = "force-dynamic";
const transitions: Record<string, string[]> = {
  payment_pending: ["cancelled"], requested: ["matched", "cancelled"], matched: ["driver_arriving", "cancelled"],
  driver_arriving: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"], completed: [], cancelled: [], refunded: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(); if (!admin) return forbidden();
  try {
    const { id } = await context.params; const { status, note } = await request.json() as { status?: string; note?: string };
    const db = await ensureSchema(); const ride = await db.prepare("SELECT id, status FROM rides WHERE id = ?").bind(id).first<{ id: string; status: string }>();
    if (!ride) return Response.json({ error: "Ride not found" }, { status: 404 });
    if (!status || !transitions[ride.status]?.includes(status)) return Response.json({ error: `Transition from ${ride.status} to ${status ?? "unknown"} is not allowed` }, { status: 409 });
    const now = Date.now();
    await db.batch([
      db.prepare("UPDATE rides SET status = ?, updated_at = ? WHERE id = ? AND status = ?").bind(status, now, id, ride.status),
      db.prepare("INSERT INTO ride_events (id, ride_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, `admin_${status}`, note?.slice(0, 500) || null, now),
    ]);
    await audit(admin.email, "ride.status_changed", "ride", id, { from: ride.status, to: status, note: note?.slice(0, 500) || null });
    return Response.json({ ok: true, id, status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Ride update failed" }, { status: 400 }); }
}
