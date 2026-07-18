import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { ensureSchema } from "@/app/lib/database";

function allowlist() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email: string) {
  return allowlist().has(email.trim().toLowerCase());
}

export async function requireAdminPage(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  return { user, allowed: isAdminEmail(user.email) };
}

export async function requireAdminApi(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function audit(actorEmail: string, action: string, entityType: string, entityId: string, detail?: Record<string, unknown>) {
  const db = await ensureSchema();
  await db.prepare("INSERT INTO admin_audit (id, actor_email, action, entity_type, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), actorEmail.toLowerCase(), action, entityType, entityId, detail ? JSON.stringify(detail) : null, Date.now()).run();
}

export function forbidden() {
  return Response.json({ error: "Administrator access required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
