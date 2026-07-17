import { createSessionCookie, normalizeDutchPhone } from "@/app/lib/auth";
import { ensureSchema } from "@/app/lib/database";
import { twilioForm } from "@/app/lib/services";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json() as { phone?: string; code?: string };
    const normalized = normalizeDutchPhone(phone ?? "");
    if (!/^\d{4,10}$/.test(code ?? "")) throw new Error("Enter the verification code");
    const result = await twilioForm("VerificationCheck", { To: normalized, Code: code! });
    if (result.status !== "approved") throw new Error("The code is incorrect or expired");
    const db = await ensureSchema();
    let user = await db.prepare("SELECT id, phone FROM users WHERE phone = ?").bind(normalized).first<{ id: string; phone: string }>();
    if (!user) {
      user = { id: crypto.randomUUID(), phone: normalized };
      await db.prepare("INSERT INTO users (id, phone, role, created_at) VALUES (?, ?, 'rider', ?)").bind(user.id, user.phone, Date.now()).run();
    }
    return Response.json({ ok: true, user }, { headers: { "Set-Cookie": await createSessionCookie(user.id, user.phone) } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 }); }
}
