import { CognitoJwtVerifier } from "aws-jwt-verify";
import { clearFlowCookie, cognitoConfig, createAdminCookie, readFlowCookie } from "@/app/lib/admin-session";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const flow = await readFlowCookie(request.headers.get("cookie") ?? "");
    if (!flow || url.searchParams.get("state") !== flow.state) throw new Error("Login session expired or could not be verified");
    const code = url.searchParams.get("code");
    if (!code) throw new Error(url.searchParams.get("error_description") || "Cognito did not return an authorization code");
    const { userPoolId, clientId, domain, appUrl } = cognitoConfig();
    const callback = `${appUrl}/api/admin/auth/callback`;
    const tokenResponse = await fetch(`${domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code, redirect_uri: callback, code_verifier: flow.verifier }),
    });
    const tokens = await tokenResponse.json() as { id_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokens.id_token) throw new Error(tokens.error_description || "Cognito token exchange failed");
    const verifier = CognitoJwtVerifier.create({ userPoolId, tokenUse: "id", clientId });
    const claims = await verifier.verify(tokens.id_token);
    const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
    if (!email || claims.email_verified !== true) throw new Error("A verified administrator email is required");
    const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : email.split("@")[0];
    const response = new Response(null, { status: 302, headers: { Location: new URL(flow.returnTo, appUrl).toString(), "Cache-Control": "no-store" } });
    response.headers.append("Set-Cookie", await createAdminCookie({ email, name }));
    response.headers.append("Set-Cookie", clearFlowCookie());
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Administrator login failed" }, { status: 401, headers: { "Set-Cookie": clearFlowCookie(), "Cache-Control": "no-store" } });
  }
}
