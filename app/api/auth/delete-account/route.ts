import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Card from "@/lib/models/Card";
import Transaction from "@/lib/models/Transaction";
import Utility from "@/lib/models/Utility";
import CustomItem from "@/lib/models/CustomItem";
import { AUTH_COOKIE_NAME, requireAuth, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { password } = await request.json();
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "請輸入密碼確認" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }

  if (!(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "密碼不正確" }, { status: 401 });
  }

  await Promise.all([
    Card.deleteMany({ user: auth.userId }),
    Transaction.deleteMany({ user: auth.userId }),
    Utility.deleteMany({ user: auth.userId }),
    CustomItem.deleteMany({ user: auth.userId }),
  ]);
  await User.deleteOne({ _id: auth.userId });

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
