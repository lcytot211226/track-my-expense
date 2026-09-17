import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { calculateBillingPeriod } from "@/lib/calculateBillingPeriod";
import { addMonthsClamped } from "@/lib/addMonths";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";

/** 建立一筆分期購買:一次生成 totalNumber 筆交易(每期一筆),共用同一個 installmentGroupId。 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { item, date, card, totalAmount, totalNumber } = await request.json();

  if (!item || !date || !card || !totalAmount || !totalNumber) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (totalNumber < 1 || !Number.isInteger(totalNumber)) {
    return NextResponse.json({ error: "總期數必須是正整數" }, { status: 400 });
  }

  await connectToDatabase();

  const cardDoc = await Card.findOne({ _id: card, user: auth.userId });
  if (!cardDoc) {
    return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
  }
  const cardBillingInfo = { closingDate: cardDoc.closingDate, paymentDate: cardDoc.paymentDate };

  const purchaseDate = new Date(date);
  const installmentGroupId = new mongoose.Types.ObjectId();

  // 除不盡的餘數放在第一期,其餘各期金額相同。
  const perPeriodAmount = Math.floor(totalAmount / totalNumber);
  const firstPeriodAmount = totalAmount - perPeriodAmount * (totalNumber - 1);

  const docs = Array.from({ length: totalNumber }, (_, i) => {
    const periodDate = addMonthsClamped(purchaseDate, i);
    const amount = i === 0 ? firstPeriodAmount : perPeriodAmount;
    const billingPeriod = calculateBillingPeriod(periodDate, "installment", true, cardBillingInfo);

    return {
      user: auth.userId,
      type: "expense" as const,
      date: periodDate,
      category: "installment" as const,
      item,
      card,
      installmentInfo: { currentNumber: i + 1, totalNumber },
      amount,
      posted: true,
      billingPeriod,
      installmentGroupId,
    };
  });

  const transactions = await Transaction.insertMany(docs);

  const touchedPeriods = new Set(docs.map((d) => d.billingPeriod));
  for (const period of touchedPeriods) {
    await recomputeOverviewSummary(auth.userId, period);
  }

  return NextResponse.json({ transactions }, { status: 201 });
}
