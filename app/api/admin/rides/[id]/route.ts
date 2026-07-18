import { audit, forbidden, requireAdminApi } from "@/app/lib/admin";
import { getRide, updateRideStatus } from "@/app/lib/database";

export const dynamic = "force-dynamic";
const transitions: Record<string, string[]> = {
  payment_pending: ["cancelled"], requested: ["matched", "cancelled"], matched: ["driver_arriving", "cancelled"],
  driver_arriving: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"], completed: [], cancelled: [], refunded: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(); if (!admin) return forbidden();
  try {
    const { id } = await context.params; const { status, note } = await request.json() as { status?: string; note?: string };
    const ride = await getRide(id);
    if (!ride) return Response.json({ error: "Ride not found" }, { status: 404 });
    if (!status || !transitions[ride.status]?.includes(status)) return Response.json({ error: `Transition from ${ride.status} to ${status ?? "unknown"} is not allowed` }, { status: 409 });
    await updateRideStatus(id, ride.status, status, `admin_${status}`, note?.slice(0, 500) || null);
    await audit(admin.email, "ride.status_changed", "ride", id, { from: ride.status, to: status, note: note?.slice(0, 500) || null });
    return Response.json({ ok: true, id, status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Ride update failed" }, { status: 400 }); }
}
