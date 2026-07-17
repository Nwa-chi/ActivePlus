import { clearSessionCookie, readSession } from "@/app/lib/auth";

export async function GET(request: Request) {
  const session = await readSession(request);
  return Response.json({ user: session ? { phone: session.phone } : null });
}
export async function DELETE() { return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } }); }
