import ChangePasswordForm from "@/components/ChangePasswordForm";
import SpecialDateForm from "@/components/SpecialDateForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">設定</h1>

      <h2 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">月結算日</h2>
      <SpecialDateForm />

      <h2 className="mt-8 mb-3 font-medium text-zinc-900 dark:text-zinc-50">修改密碼</h2>
      <ChangePasswordForm />
    </div>
  );
}
