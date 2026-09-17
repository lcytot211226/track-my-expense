import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Utility from "@/lib/models/Utility";
import { requireAuth } from "@/lib/auth";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";
import { formatPeriod } from "@/lib/overviewItems";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const utility = await Utility.findOne({ _id: id, user: auth.userId });
  if (!utility) {
    return NextResponse.json({ error: "找不到資料" }, { status: 404 });
  }
  return NextResponse.json({ utility });
}

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const { year, month, date, rent, elec, water } = await request.json();

  await connectToDatabase();
  const existing = await Utility.findOne({ _id: id, user: auth.userId });
  if (!existing) {
    return NextResponse.json({ error: "找不到資料" }, { status: 404 });
  }
  const utility = await Utility.findOneAndUpdate(
    { _id: id, user: auth.userId },
    { year, month, date, rent, elec, water },
    { new: true, runValidators: true }
  );
  if (!utility) {
    return NextResponse.json({ error: "找不到資料" }, { status: 404 });
  }
  await recomputeOverviewSummary(auth.userId, formatPeriod(utility.year, utility.month));
  if (utility.year !== existing.year || utility.month !== existing.month) {
    await recomputeOverviewSummary(auth.userId, formatPeriod(existing.year, existing.month));
  }
  return NextResponse.json({ utility });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const utility = await Utility.findOneAndDelete({ _id: id, user: auth.userId });
  if (!utility) {
    return NextResponse.json({ error: "找不到資料" }, { status: 404 });
  }
  await recomputeOverviewSummary(auth.userId, formatPeriod(utility.year, utility.month));
  return NextResponse.json({ success: true });
}
