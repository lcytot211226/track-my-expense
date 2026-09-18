import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable in .env.local");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

/** 唯一能使用 /admin 後台功能(例如發送系統通知)的帳號。 */
export const ADMIN_EMAIL = "lcytot211226@gmail.com";

export const AUTH_COOKIE_NAME = "auth_token";
// Session TTL 拉長,並在 proxy.ts 內每次請求時滑動延長(sliding session),
// 只要使用者在效期內有造訪過,登入就會一直維持,達到「自動保持登入」的效果。
const TOKEN_TTL = "30d";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** 供 Server Component / Route Handler 使用,讀取目前登入的使用者(未登入則回傳 null)。 */
export async function getCurrentUser(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

/** 供 API Route 使用,未登入時回傳 null,呼叫端應回應 401。 */
export async function requireAuth(): Promise<AuthTokenPayload | null> {
  return getCurrentUser();
}
