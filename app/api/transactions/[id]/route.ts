import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { calculateBillingPeriod } from "@/lib/calculateBillingPeriod";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";
import { parsePointsDiscount } from "@/lib/pointsDiscount";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const transaction = await Transaction.findOne({ _id: id, user: auth.userId }).populate("card");
  if (!transaction) {
    return NextResponse.json({ error: "找不到交易紀錄" }, { status: 404 });
  }
  return NextResponse.json({ transaction });
}

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { type, date, category, item, card, installmentInfo, amount, posted, pointsDiscount } = body;

  await connectToDatabase();
  const existing = await Transaction.findOne({ _id: id, user: auth.userId });
  if (!existing) {
    return NextResponse.json({ error: "找不到交易紀錄" }, { status: 404 });
  }

  const finalCategory = category ?? existing.category;
  const finalDate = date ? new Date(date) : existing.date;
  const finalPosted = posted ?? existing.posted;
  const finalCard = category === "cash" ? null : (card ?? existing.card);

  let cardBillingInfo = null;
  if (finalCategory !== "cash") {
    if (!finalCard) {
      return NextResponse.json({ error: "信用卡/分期交易需要指定卡片" }, { status: 400 });
    }
    const cardDoc = await Card.findOne({ _id: finalCard, user: auth.userId });
    if (!cardDoc) {
      return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
    }
    cardBillingInfo = { closingDate: cardDoc.closingDate, paymentDate: cardDoc.paymentDate };
  }

  const billingPeriod = calculateBillingPeriod(finalDate, finalCategory, finalPosted, cardBillingInfo);

  const finalType = type ?? existing.type;
  const finalAmount = amount ?? existing.amount;
  // 沒帶 pointsDiscount 就沿用原本的值(若改成不適用的付款方式/類型,會在這裡被清掉)
  const discount = parsePointsDiscount(pointsDiscount === undefined ? existing.pointsDiscount : pointsDiscount, {
    type: finalType,
    category: finalCategory,
    amount: Number(finalAmount),
  });
  if ("error" in discount) {
    return NextResponse.json({ error: discount.error }, { status: 400 });
  }

  const transaction = await Transaction.findOneAndUpdate(
    { _id: id, user: auth.userId },
    {
      type: finalType,
      date: finalDate,
      category: finalCategory,
      item: item ?? existing.item,
      card: finalCard,
      installmentInfo: finalCategory === "installment" ? (installmentInfo ?? existing.installmentInfo) : null,
      amount: finalAmount,
      // 沒有折抵就把欄位整個移除,而不是存 0
      ...(discount.value != null ? { pointsDiscount: discount.value } : { $unset: { pointsDiscount: 1 } }),
      posted: finalPosted,
      billingPeriod,
      // 改成非分期就跟原本那組分期脫鉤,避免之後誤刪到其他期數。
      installmentGroupId: finalCategory === "installment" ? existing.installmentGroupId : null,
    },
    { new: true, runValidators: true }
  ).populate("card");

  await recomputeOverviewSummary(auth.userId, billingPeriod);
  if (existing.billingPeriod !== billingPeriod) {
    await recomputeOverviewSummary(auth.userId, existing.billingPeriod);
  }

  return NextResponse.json({ transaction });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const existing = await Transaction.findOne({ _id: id, user: auth.userId });
  if (!existing) {
    return NextResponse.json({ error: "找不到交易紀錄" }, { status: 404 });
  }

  // 分期交易(有 installmentGroupId)刪除時,同一組的所有期數要一起刪掉。
  if (existing.installmentGroupId) {
    const group = await Transaction.find({
      user: auth.userId,
      installmentGroupId: existing.installmentGroupId,
    });
    const periods = new Set(group.map((t) => t.billingPeriod));
    const result = await Transaction.deleteMany({
      user: auth.userId,
      installmentGroupId: existing.installmentGroupId,
    });
    for (const period of periods) {
      await recomputeOverviewSummary(auth.userId, period);
    }
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  }

  await Transaction.deleteOne({ _id: id, user: auth.userId });
  await recomputeOverviewSummary(auth.userId, existing.billingPeriod);
  return NextResponse.json({ success: true, deletedCount: 1 });
}
