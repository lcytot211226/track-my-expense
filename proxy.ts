import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, signAuthToken, verifyAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? await verifyAuthToken(token) : null;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 每次請求都重新簽發並延長 cookie 效期(sliding session),
  // 只要使用者持續在 30 天內造訪過,就會一直維持登入狀態,不需手動重新登入。
  const response = NextResponse.next();
  const refreshedToken = await signAuthToken({ userId: user.userId, email: user.email });
  response.cookies.set(AUTH_COOKIE_NAME, refreshedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
