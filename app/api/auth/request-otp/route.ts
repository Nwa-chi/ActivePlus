import { normalizeDutchPhone } from "@/app/lib/auth";
import { twilioForm } from "@/app/lib/services";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json() as { phone?: string };
    const normalized = normalizeDutchPhone(phone ?? "");
    await twilioForm("Verifications", { To: normalized, Channel: "sms", Locale: "nl" });
    return Response.json({ ok: true, phone: normalized.replace(/(\+31\d{2})\d{4}(\d{3})/, "$1••••$2") });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to send code" }, { status: 400 }); }
}
