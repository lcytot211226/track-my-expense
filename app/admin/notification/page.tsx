import AdminNotificationClient from "@/components/AdminNotificationClient";

export default function AdminNotificationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">發送系統通知</h1>
      <AdminNotificationClient />
    </div>
  );
}
