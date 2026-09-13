import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/lib/models/Card";
import CardForm, { type CardDTO } from "@/components/CardForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">信用卡管理</h1>
      <CardForm initialCards={cardDTOs} />
    </div>
  );
}
