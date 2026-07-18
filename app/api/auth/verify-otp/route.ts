import { createSessionCookie, normalizeDutchPhone } from "@/app/lib/auth";
import { createRider, findUserByPhone } from "@/app/lib/database";
import { twilioForm } from "@/app/lib/services";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json() as { phone?: string; code?: string };
    const normalized = normalizeDutchPhone(phone ?? "");
    if (!/^\d{4,10}$/.test(code ?? "")) throw new Error("Enter the verification code");
    const result = await twilioForm("VerificationCheck", { To: normalized, Code: code! });
    if (result.status !== "approved") throw new Error("The code is incorrect or expired");
    let user = await findUserByPhone(normalized);
    if (!user) user = await createRider(normalized);
    return Response.json({ ok: true, user }, { headers: { "Set-Cookie": await createSessionCookie(user.id, user.phone) } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 }); }
}
