const COOKIE = "ap_session";
const encoder = new TextEncoder();

type Session = { userId: string; phone: string; exp: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let raw = "";
  bytes.forEach((byte) => raw += String.fromCharCode(byte));
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decode64(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function createSessionCookie(userId: string, phone: string) {
  const data: Session = { userId, phone, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 };
  const payload = base64url(JSON.stringify(data));
  return `${COOKIE}=${payload}.${await signature(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export async function readSession(request: Request): Promise<Session | null> {
  const cookies = request.headers.get("cookie") ?? "";
  const value = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || await signature(payload) !== sig) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(decode64(payload))) as Session;
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function normalizeDutchPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("0031") ? digits.slice(4) : digits.startsWith("31") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^6\d{8}$/.test(local)) throw new Error("Enter a valid Dutch mobile number");
  return `+31${local}`;
}
