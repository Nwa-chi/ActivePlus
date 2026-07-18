import { clearAdminCookie } from "@/app/lib/admin-session";

export async function GET(request: Request) {
  return new Response(null, { status: 302, headers: { Location: new URL("/", request.url).toString(), "Set-Cookie": clearAdminCookie(), "Cache-Control": "no-store" } });
}
