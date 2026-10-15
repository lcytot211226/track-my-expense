import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { ADMIN_EMAIL, requireAuth } from "@/lib/auth";

const PAGE_SIZE = 20;

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 後台用:分頁列出所有使用者(註冊時間新到舊,每頁 20 筆),`?page=`(從 1 開始)、`?q=` 依 email 模糊搜尋。 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth || auth.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = Math.floor(Number(searchParams.get("page")));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const q = searchParams.get("q")?.trim() ?? "";
  const filter = q ? { email: { $regex: escapeRegex(q), $options: "i" } } : {};

  await connectToDatabase();
  const [users, total] = await Promise.all([
    User.find(filter, { email: 1, createDate: 1, emailVerified: 1 })
      .sort({ createDate: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({ users, total, page, pageSize: PAGE_SIZE });
}
