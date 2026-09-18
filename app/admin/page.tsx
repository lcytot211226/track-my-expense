import Link from "next/link";

const ADMIN_TOOLS = [{ href: "/admin/notification", title: "系統通知", description: "發送公告給所有使用者" }];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">管理員</h1>
      <div className="flex flex-col gap-3">
        {ADMIN_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-lg border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{tool.title}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
