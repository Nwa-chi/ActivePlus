import { redirect } from "next/navigation";
import { currentAdminSession, type AdminSession } from "@/app/lib/admin-session";
import { recordAudit } from "@/app/lib/database";

function allowlist() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email: string) {
  return allowlist().has(email.trim().toLowerCase());
}

export async function requireAdminPage(returnTo = "/admin") {
  const user = await currentAdminSession();
  if (!user) redirect(`/api/admin/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return { user, allowed: isAdminEmail(user.email) };
}

export async function requireAdminApi(): Promise<AdminSession | null> {
  const user = await currentAdminSession();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function audit(actorEmail: string, action: string, entityType: string, entityId: string, detail?: Record<string, unknown>) {
  await recordAudit({ id: crypto.randomUUID(), actorEmail: actorEmail.toLowerCase(), action, entityType, entityId, detail: detail ? JSON.stringify(detail) : null, createdAt: Date.now() });
}

export function forbidden() {
  return Response.json({ error: "Administrator access required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
