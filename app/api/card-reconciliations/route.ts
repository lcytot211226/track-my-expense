import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CardReconciliation from "@/lib/models/CardReconciliation";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  if (!period) {
    return NextResponse.json({ error: "缺少 period" }, { status: 400 });
  }

  await connectToDatabase();
  const records = await CardReconciliation.find({ user: auth.userId, period });
  return NextResponse.json({ cardIds: records.map((r) => r.card.toString()) });
}

/** 標記/取消標記某張卡在某個月已對帳;用「有沒有這筆紀錄」表示對帳狀態,不用額外欄位。 */
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { card, period, reconciled } = await request.json();
  if (!card || !period) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  await connectToDatabase();

  if (reconciled) {
    await CardReconciliation.findOneAndUpdate(
      { user: auth.userId, card, period },
      { user: auth.userId, card, period },
      { upsert: true }
    );
  } else {
    await CardReconciliation.deleteOne({ user: auth.userId, card, period });
  }

  return NextResponse.json({ reconciled: !!reconciled });
}
