"use client";

import { useState } from "react";

/**
 * 金額顯示一律四捨五入到整數;若實際值有小數(例如電費 = 度數 × 含小數的單價),
 * 會變成可以點的按鈕,點一下切換顯示實際金額,再點一次回到四捨五入。
 */
export default function RoundedAmount({ value, className }: { value: number; className?: string }) {
  const [showExact, setShowExact] = useState(false);
  const rounded = Math.round(value);
  // 先去掉浮點誤差(例如 0.1 × 3 = 0.30000000000000004),再判斷是否真的有小數
  const exact = Number(value.toFixed(4));

  if (exact === rounded) {
    return <span className={className}>${rounded.toLocaleString()}</span>;
  }

  const exactLabel = `$${exact.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  // 用 span + role="button" 而不是 <button>,因為外層可能本身就是 <button>(例如共享總額),巢狀 button 不合法。
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // 外層可能本身也是可點的區塊,避免一起觸發
        e.stopPropagation();
        setShowExact((prev) => !prev);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        setShowExact((prev) => !prev);
      }}
      title={showExact ? "點擊顯示四捨五入金額" : `實際金額 ${exactLabel},點擊查看`}
      className={`cursor-pointer underline decoration-zinc-400 decoration-dotted underline-offset-4 dark:decoration-zinc-500 ${className ?? ""}`}
    >
      {showExact ? exactLabel : `$${rounded.toLocaleString()}`}
    </span>
  );
}
