import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getPiggyBankHistory } from "@/lib/getPiggyBankHistory";
import PiggyBankClient from "@/components/PiggyBankClient";

export const dynamic = "force-dynamic";

export default async function PiggyBankPage() {
  const auth = await getCurrentUser();
  await connectToDatabase();
  const months = await getPiggyBankHistory(auth!.userId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">存錢罐</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        每個月存下 = max(min(存錢前的當月結餘, 想存的金額), 0),並計入當月支出;結餘只看自己的收支,不含共享項目
      </p>
      <PiggyBankClient months={months} />
    </div>
  );
}
