import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const card = await Card.findOne({ _id: id, user: auth.userId });
  if (!card) {
    return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
  }
  return NextResponse.json({ card });
}

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const { name, closingDate, paymentDate } = await request.json();

  await connectToDatabase();
  const card = await Card.findOneAndUpdate(
    { _id: id, user: auth.userId },
    { name, closingDate, paymentDate },
    { new: true, runValidators: true }
  );
  if (!card) {
    return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
  }
  return NextResponse.json({ card });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const card = await Card.findOneAndDelete({ _id: id, user: auth.userId });
  if (!card) {
    return NextResponse.json({ error: "找不到卡片" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
