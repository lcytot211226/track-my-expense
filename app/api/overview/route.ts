import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Utility from "@/lib/models/Utility";
import CustomItem from "@/lib/models/CustomItem";
import PiggyBank from "@/lib/models/PiggyBank";
import { requireAuth } from "@/lib/auth";
import { getCardReconciliationStatuses } from "@/lib/getCardReconciliationStatuses";
import { getIncomingShares } from "@/lib/getIncomingShares";

/**
 * /overview 專用的整合 API:把總覽頁只有這裡會讀的資料一次回傳,減少來回次數。
 * 交易(/api/transactions)與卡片(/api/cards)其他頁面也會獨立呼叫,不併進來,由 /overview 另外各打一支。
 * 各項資料的形狀與對應的獨立 API 相同,那些 API 仍保留。
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "缺少或格式錯誤的 period(YYYY-MM)" }, { status: 400 });
  }
  const [year, month] = period.split("-").map(Number);

  await connectToDatabase();
  const [utility, customItems, cardStatuses, incomingShares, piggyBank] = await Promise.all([
    Utility.findOne({ user: auth.userId, year, month }),
    CustomItem.find({ user: auth.userId, year, month }).sort({ createdAt: 1 }),
    getCardReconciliationStatuses(auth.userId, period),
    getIncomingShares(auth.email, period),
    PiggyBank.findOne({ user: auth.userId, period }),
  ]);

  return NextResponse.json({
    utility,
    customItems,
    cardStatuses,
    incomingShares,
    // 這個月存錢罐想存的金額,沒設定是 null;實際存下多少由前端用當月結餘即時算
    piggyBankAmount: piggyBank?.amount ?? null,
  });
}
