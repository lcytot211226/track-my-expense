import { Suspense } from "react";
import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/lib/models/Card";
import TransactionsClient from "@/components/TransactionsClient";
import type { CardDTO } from "@/components/CardForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExpensePage() {
  const auth = await getCurrentUser();
  await connectToDatabase();
  const cards = await Card.find({ user: auth!.userId }).sort({ createdAt: 1 }).lean();
  const cardDTOs: CardDTO[] = cards.map((card) => ({
    _id: card._id.toString(),
    name: card.name,
    closingDate: card.closingDate,
    paymentDate: card.paymentDate,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">支出總覽</h1>
      <Suspense fallback={null}>
        <TransactionsClient type="expense" initialCards={cardDTOs} />
      </Suspense>
    </div>
  );
}
