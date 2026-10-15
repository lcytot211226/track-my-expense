import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { ADMIN_EMAIL, getCurrentUser } from "@/lib/auth";
import { getAdminStats } from "@/lib/getAdminStats";
import AdminStatsSection from "@/components/AdminStatsSection";
import AdminUsersClient from "@/components/AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // admin/layout.tsx 已經擋過,但 layout 在 client 端切換頁面時不會重新執行(Partial Rendering),
  // 這頁在 server 端直接撈統計資料,所以要在頁面本身再檢查一次。
  const user = await getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/overview");

  await connectToDatabase();
  const { signups, transactions } = await getAdminStats();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">使用者</h1>
      <div className="flex flex-col gap-4">
        <AdminStatsSection signups={signups} transactions={transactions} />
        <AdminUsersClient />
      </div>
    </div>
  );
}
