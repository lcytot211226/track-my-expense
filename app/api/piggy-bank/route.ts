import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PiggyBank from "@/lib/models/PiggyBank";
import { requireAuth } from "@/lib/auth";
import { getPiggyBankHistory } from "@/lib/getPiggyBankHistory";

/** 每個有設定存錢罐的月份,連同結餘與實際存下的金額(由舊到新)。 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  const months = await getPiggyBankHistory(auth.userId, auth.email);
  return NextResponse.json({ months });
}

/** `{ period, amount }` 設定某個月想存的金額;`amount: null` 刪除該月的存錢罐。 */
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { period, amount } = await request.json();
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "缺少或格式錯誤的 period(YYYY-MM)" }, { status: 400 });
  }
  if (amount !== null && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "金額必須是大於等於 0 的數字" }, { status: 400 });
  }

  await connectToDatabase();
  if (amount === null) {
    await PiggyBank.deleteOne({ user: auth.userId, period });
  } else {
    await PiggyBank.findOneAndUpdate(
      { user: auth.userId, period },
      { user: auth.userId, period, amount },
      { upsert: true, runValidators: true }
    );
  }
  return NextResponse.json({ amount });
}
