import { adminAuthProvider, clearAdminCookie } from "@/app/lib/admin-session";

export async function GET(request: Request) {
  if (adminAuthProvider() === "azure") {
    const logout = new URL("/.auth/logout", request.url);
    logout.searchParams.set("post_logout_redirect_uri", "/");
    return new Response(null, { status: 302, headers: { Location: logout.toString(), "Cache-Control": "no-store" } });
  }
  return new Response(null, { status: 302, headers: { Location: new URL("/", request.url).toString(), "Set-Cookie": clearAdminCookie(), "Cache-Control": "no-store" } });
}
