import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, signAuthToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "請輸入 email 與密碼" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await User.findOne({ email });
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const token = await signAuthToken({ userId: user._id.toString(), email: user.email });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ success: true });
}
