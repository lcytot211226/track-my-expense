import { Suspense } from "react";
import OverviewClient from "@/components/OverviewClient";

export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">總覽</h1>
      <Suspense fallback={null}>
        <OverviewClient />
      </Suspense>
    </div>
  );
}
