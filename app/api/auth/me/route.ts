import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }

  return NextResponse.json({ email: user.email, specialDate: user.specialDate ?? null });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { specialDate } = await request.json();
  if (
    specialDate !== null &&
    (typeof specialDate !== "number" || !Number.isInteger(specialDate) || specialDate < 1 || specialDate > 31)
  ) {
    return NextResponse.json({ error: "月結算日須為 1-31 的整數" }, { status: 400 });
  }

  await connectToDatabase();
  const update = specialDate === null ? { $unset: { specialDate: 1 } } : { $set: { specialDate } };
  const user = await User.findByIdAndUpdate(auth.userId, update, { new: true });
  if (!user) {
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }

  return NextResponse.json({ success: true, specialDate: user.specialDate ?? null });
}
