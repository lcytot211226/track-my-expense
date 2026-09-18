import { redirect } from "next/navigation";
import { ADMIN_EMAIL, getCurrentUser } from "@/lib/auth";

/** /admin 底下所有頁面共用的權限檢查,只有 ADMIN_EMAIL 這個帳號能進來,其他人一律導回 /overview。 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/overview");
  }

  return children;
}
