import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CustomItem from "@/lib/models/CustomItem";
import { requireAuth } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const { name, amount } = await request.json();

  await connectToDatabase();
  const item = await CustomItem.findOneAndUpdate(
    { _id: id, user: auth.userId },
    { name, amount },
    { new: true, runValidators: true }
  );
  if (!item) {
    return NextResponse.json({ error: "找不到資料" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const item = await CustomItem.findOneAndDelete({ _id: id, user: auth.userId });
  if (!item) {
    return NextResponse.json({ error: "找不到資料" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
