import { headers } from "next/headers";

const COOKIE = "ap_admin_session";
const FLOW_COOKIE = "ap_admin_flow";
const encoder = new TextEncoder();

export type AdminSession = { email: string; name: string; exp: number };
export type AdminFlow = { state: string; verifier: string; returnTo: string; exp: number };

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
  return readAdminCookie(requestHeaders.get("cookie") ?? "");
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
