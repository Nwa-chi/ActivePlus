import { headers } from "next/headers";

const COOKIE = "ap_admin_session";
const FLOW_COOKIE = "ap_admin_flow";
const encoder = new TextEncoder();

export type AdminSession = { email: string; name: string; exp: number };
export type AdminFlow = { state: string; verifier: string; returnTo: string; exp: number };

type AzurePrincipal = {
  auth_typ?: string;
  claims?: Array<{ typ?: string; val?: string }>;
};

export function adminAuthProvider() {
  return process.env.ADMIN_AUTH_PROVIDER?.trim().toLowerCase() === "azure" ? "azure" : "cognito";
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

async function pack(value: object) {
  const payload = base64url(JSON.stringify(value));
  return `${payload}.${await sign(payload)}`;
}

async function unpack<T>(value?: string): Promise<T | null> {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || await sign(payload) !== signature) return null;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T; }
  catch { return null; }
}

function cookieValue(cookieHeader: string, name: string) {
  return cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function createAdminCookie(session: Omit<AdminSession, "exp">) {
  return `${COOKIE}=${await pack({ ...session, exp: Date.now() + 8 * 60 * 60 * 1000 })}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`;
}

export async function readAdminCookie(cookieHeader: string): Promise<AdminSession | null> {
  const session = await unpack<AdminSession>(cookieValue(cookieHeader, COOKIE));
  return session && session.exp > Date.now() ? session : null;
}

export async function currentAdminSession() {
  const requestHeaders = await headers();
  if (adminAuthProvider() === "azure") return azureAdminSession(requestHeaders);
  return readAdminCookie(requestHeaders.get("cookie") ?? "");
}

function azureAdminSession(requestHeaders: Headers): AdminSession | null {
  // Azure App Service Authentication injects this header after validating the
  // Entra session. Requiring App Service runtime variables prevents accidental
  // trust of a caller-supplied header on other hosts.
  if (!process.env.WEBSITE_SITE_NAME || !process.env.WEBSITE_HOSTNAME) return null;
  const encoded = requestHeaders.get("x-ms-client-principal");
  if (!encoded) return null;
  try {
    const principal = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as AzurePrincipal;
    if (principal.auth_typ?.toLowerCase() !== "aad" || !Array.isArray(principal.claims)) return null;
    const claims = new Map(principal.claims.flatMap((claim) => claim.typ && claim.val ? [[claim.typ.toLowerCase(), claim.val]] : []));
    const email = [
      "preferred_username",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
      "email",
    ].map((key) => claims.get(key)?.trim().toLowerCase()).find(Boolean);
    if (!email || !email.includes("@")) return null;
    const name = claims.get("name")?.trim()
      || claims.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.trim()
      || email.split("@")[0];
    return { email, name, exp: Date.now() + 60 * 60 * 1000 };
  } catch {
    return null;
  }
}

export async function createFlowCookie(flow: Omit<AdminFlow, "exp">) {
  return `${FLOW_COOKIE}=${await pack({ ...flow, exp: Date.now() + 10 * 60 * 1000 })}; Path=/api/admin/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export async function readFlowCookie(cookieHeader: string): Promise<AdminFlow | null> {
  const flow = await unpack<AdminFlow>(cookieValue(cookieHeader, FLOW_COOKIE));
  return flow && flow.exp > Date.now() ? flow : null;
}

export function clearAdminCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function clearFlowCookie() {
  return `${FLOW_COOKIE}=; Path=/api/admin/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function safeReturnTo(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export function cognitoConfig() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const domain = process.env.COGNITO_DOMAIN?.replace(/\/$/, "");
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") || "https://attivplus.com";
  if (!userPoolId || !clientId || !domain) throw new Error("Administrator identity is not configured");
  return { userPoolId, clientId, domain, appUrl };
}
