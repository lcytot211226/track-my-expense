import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { calculateBillingPeriod } from "@/lib/calculateBillingPeriod";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const billingPeriod = searchParams.get("billingPeriod");
  const category = searchParams.get("category");
  const card = searchParams.get("card");

  const filter: Record<string, unknown> = { user: auth.userId };
  if (type) filter.type = type;
  if (billingPeriod) filter.billingPeriod = billingPeriod;
  if (category) filter.category = category;
  if (card) filter.card = card;

  await connectToDatabase();
  const transactions = await Transaction.find(filter).populate("card").sort({ date: -1 });
  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await request.json();
  const { type, date, category, item, card, installmentInfo, amount, posted } = body;

  if (!type || !date || !category || !item || amount === undefined) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  await connectToDatabase();

  let cardBillingInfo = null;
  if (category !== "cash") {
    if (!card) {
      return NextResponse.json({ error: "信用卡/分期交易需要指定卡片" }, { status: 400 });
    }
    const cardDoc = await Card.findOne({ _id: card, user: auth.userId });
    if (!cardDoc) {
      return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
    }
    cardBillingInfo = { closingDate: cardDoc.closingDate, paymentDate: cardDoc.paymentDate };
  }

  const isPosted = posted ?? true;
  const billingPeriod = calculateBillingPeriod(new Date(date), category, isPosted, cardBillingInfo);

  const transaction = await Transaction.create({
    user: auth.userId,
    type,
    date: new Date(date),
    category,
    item,
    card: category === "cash" ? null : card,
    installmentInfo: category === "installment" ? installmentInfo : null,
    amount,
    posted: isPosted,
    billingPeriod,
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
