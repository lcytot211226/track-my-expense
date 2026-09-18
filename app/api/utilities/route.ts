import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Utility from "@/lib/models/Utility";
import { requireAuth } from "@/lib/auth";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";
import { formatPeriod } from "@/lib/overviewItems";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const filter: Record<string, unknown> = { user: auth.userId };
  if (year) filter.year = Number(year);
  if (month) filter.month = Number(month);

  await connectToDatabase();
  const utilities = await Utility.find(filter).sort({ year: -1, month: -1 });
  return NextResponse.json({ utilities });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { year, month, date, rent, elec, water, rentEnabled, elecEnabled, waterEnabled, enabled } =
    await request.json();
  if (!year || !month || !date) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  await connectToDatabase();
  const utility = await Utility.create({
    user: auth.userId,
    year,
    month,
    date,
    rent,
    elec,
    water,
    rentEnabled,
    elecEnabled,
    waterEnabled,
    enabled,
  });
  await recomputeOverviewSummary(auth.userId, formatPeriod(year, month));
  return NextResponse.json({ utility }, { status: 201 });
}

/** Inline edit 用:依 year+month upsert 該月的房租水電費資料。前端一律送整份資料,不做局部更新。 */
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { year, month, date, rent, elec, water, rentEnabled, elecEnabled, waterEnabled, enabled } =
    await request.json();
  if (!year || !month) {
    return NextResponse.json({ error: "缺少 year/month" }, { status: 400 });
  }

  await connectToDatabase();
  const utility = await Utility.findOneAndUpdate(
    { user: auth.userId, year, month },
    { user: auth.userId, year, month, date, rent, elec, water, rentEnabled, elecEnabled, waterEnabled, enabled },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await recomputeOverviewSummary(auth.userId, formatPeriod(year, month));
  return NextResponse.json({ utility });
}
