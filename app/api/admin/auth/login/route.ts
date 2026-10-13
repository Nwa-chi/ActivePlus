import { adminAuthProvider, cognitoConfig, createFlowCookie, safeReturnTo } from "@/app/lib/admin-session";

export async function GET(request: Request) {
  try {
    const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
    if (adminAuthProvider() === "azure") {
      const login = new URL("/.auth/login/aad", request.url);
      login.searchParams.set("post_login_redirect_uri", returnTo);
      return new Response(null, { status: 302, headers: { Location: login.toString(), "Cache-Control": "no-store" } });
    }
    const { clientId, domain, appUrl } = cognitoConfig();
    const state = crypto.randomUUID();
    const verifier = Buffer.from(crypto.getRandomValues(new Uint8Array(48))).toString("base64url");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = Buffer.from(digest).toString("base64url");
    const callback = `${appUrl}/api/admin/auth/callback`;
    const authorize = new URL(`${domain}/oauth2/authorize`);
    authorize.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: callback, scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
    return new Response(null, { status: 302, headers: { Location: authorize.toString(), "Set-Cookie": await createFlowCookie({ state, verifier, returnTo }), "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Administrator login is unavailable" }, { status: 503 });
  }
}
