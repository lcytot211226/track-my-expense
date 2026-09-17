"use client";

import { Suspense, useCallback, useState } from "react";
import type { CardDTO } from "./CardForm";
import SubscriptionsClient, { type SubscriptionDTO } from "./SubscriptionsClient";
import TransactionsClient from "./TransactionsClient";

export default function ExpenseClient({
  initialCards,
  initialSubscriptions,
}: {
  initialCards: CardDTO[];
  initialSubscriptions: SubscriptionDTO[];
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <TransactionsClient
          type="expense"
          initialCards={initialCards}
          refreshToken={refreshToken}
          actions={
            <SubscriptionsClient
              initialCards={initialCards}
              initialSubscriptions={initialSubscriptions}
              onChanged={bumpRefresh}
            />
          }
        />
      </Suspense>
    </div>
  );
}
