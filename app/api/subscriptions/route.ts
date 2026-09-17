import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Subscription from "@/lib/models/Subscription";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { generateDueSubscriptionTransactions } from "@/lib/generateSubscriptionTransactions";

export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  const subscriptions = await Subscription.find({ user: auth.userId }).populate("card").sort({ createdAt: 1 });
  return NextResponse.json({ subscriptions });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { item, amount, category, card, startDate } = await request.json();

  if (!item || !amount || !category || !startDate) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (category === "credit_card" && !card) {
    return NextResponse.json({ error: "信用卡訂閱需要指定卡片" }, { status: 400 });
  }

  await connectToDatabase();

  if (category === "credit_card") {
    const cardDoc = await Card.findOne({ _id: card, user: auth.userId });
    if (!cardDoc) {
      return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
    }
  }

  const subscription = await Subscription.create({
    user: auth.userId,
    item,
    amount,
    category,
    card: category === "cash" ? null : card,
    startDate: new Date(startDate),
  });

  // 建立當下就先補生成已經到期的部分,不用等下次讀取交易列表才看得到。
  await generateDueSubscriptionTransactions(auth.userId);

  return NextResponse.json({ subscription }, { status: 201 });
}
