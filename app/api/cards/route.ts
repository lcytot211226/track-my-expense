import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  const cards = await Card.find({ user: auth.userId }).sort({ createdAt: 1 });
  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { name, closingDate, paymentDate, isDebit } = await request.json();

  // 簽帳金融卡沒有結帳日 / 繳款日
  if (!name || (!isDebit && (!closingDate || !paymentDate))) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  await connectToDatabase();
  const card = await Card.create(
    isDebit
      ? { user: auth.userId, name, isDebit: true }
      : { user: auth.userId, name, isDebit: false, closingDate, paymentDate }
  );
  return NextResponse.json({ card }, { status: 201 });
}
