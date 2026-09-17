import { connectToDatabase } from "@/lib/mongodb";
import Card, { type Card as CardDoc } from "@/lib/models/Card";
import Subscription from "@/lib/models/Subscription";
import ExpenseClient from "@/components/ExpenseClient";
import type { CardDTO } from "@/components/CardForm";
import type { SubscriptionDTO } from "@/components/SubscriptionsClient";
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

  const subscriptions = await Subscription.find({ user: auth!.userId })
    .populate<{ card: CardDoc | null }>("card")
    .sort({ createdAt: 1 })
    .lean();
  const subscriptionDTOs: SubscriptionDTO[] = subscriptions.map((sub) => ({
    _id: sub._id.toString(),
    item: sub.item,
    amount: sub.amount,
    category: sub.category,
    card: sub.card
      ? {
          _id: sub.card._id.toString(),
          name: sub.card.name,
          closingDate: sub.card.closingDate,
          paymentDate: sub.card.paymentDate,
        }
      : null,
    startDate: sub.startDate.toISOString(),
    lastGeneratedDate: sub.lastGeneratedDate ? sub.lastGeneratedDate.toISOString() : null,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">支出總覽</h1>
      <ExpenseClient initialCards={cardDTOs} initialSubscriptions={subscriptionDTOs} />
    </div>
  );
}
