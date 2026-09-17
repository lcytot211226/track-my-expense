import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Share from "@/lib/models/Share";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { labelForItemKey } from "@/lib/overviewItems";

/** 我(分享者)設定過的分享清單,用來管理/刪除。 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  const [shares, cards] = await Promise.all([
    Share.find({ owner: auth.userId }).sort({ createdAt: -1 }),
    Card.find({ user: auth.userId }),
  ]);
  const cardNameById = new Map(cards.map((c) => [c._id.toString(), c.name]));

  return NextResponse.json({
    shares: shares.map((s) => ({
      _id: s._id.toString(),
      targetEmail: s.targetEmail,
      itemKey: s.itemKey,
      label: labelForItemKey(s.itemKey, cardNameById),
      included: s.included,
    })),
  });
}

/** 把一個或多個項目(itemKeys)分享給一個 email;email 不需要是已註冊的帳號。 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { targetEmail, itemKeys } = await request.json();
  const email = typeof targetEmail === "string" ? targetEmail.trim().toLowerCase() : "";
  if (!email || !Array.isArray(itemKeys) || itemKeys.length === 0) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (email === auth.email.toLowerCase()) {
    return NextResponse.json({ error: "不能分享給自己" }, { status: 400 });
  }

  await connectToDatabase();
  const shares = [];
  for (const key of itemKeys) {
    if (typeof key !== "string" || !key) continue;
    const share = await Share.findOneAndUpdate(
      { owner: auth.userId, targetEmail: email, itemKey: key },
      { owner: auth.userId, targetEmail: email, itemKey: key },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    shares.push(share);
  }

  return NextResponse.json({ shares }, { status: 201 });
}
