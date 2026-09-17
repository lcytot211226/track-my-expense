import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Subscription from "@/lib/models/Subscription";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { generateDueSubscriptionTransactions } from "@/lib/generateSubscriptionTransactions";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
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

  // 只改訂閱本身的設定,不動 lastGeneratedDate,所以已經生成過的交易不受影響,只有之後新生成的會套用新設定。
  const subscription = await Subscription.findOneAndUpdate(
    { _id: id, user: auth.userId },
    { item, amount, category, card: category === "cash" ? null : card, startDate: new Date(startDate) },
    { new: true, runValidators: true }
  ).populate("card");
  if (!subscription) {
    return NextResponse.json({ error: "找不到訂閱" }, { status: 404 });
  }

  await generateDueSubscriptionTransactions(auth.userId);

  return NextResponse.json({ subscription });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  // 只刪訂閱設定本身,停止之後繼續生成;已經生成出來的交易是獨立紀錄,不會被連帶刪除。
  const subscription = await Subscription.findOneAndDelete({ _id: id, user: auth.userId });
  if (!subscription) {
    return NextResponse.json({ error: "找不到訂閱" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
