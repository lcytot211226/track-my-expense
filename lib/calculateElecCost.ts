export type ElecInfo = {
  start: number;
  end: number;
  unitPrice: number;
  manualAmount: number | null;
};

/**
 * 電費金額:預設用 (電表結束-起始) × 每度電價計算;
 * 若使用者直接輸入帳單金額(manualAmount 有值),則以該金額為準,略過度數計算。
 */
export function calculateElecCost(elec: ElecInfo): number {
  if (elec.manualAmount !== null && elec.manualAmount !== undefined) {
    return elec.manualAmount;
  }
  return Math.max(0, elec.end - elec.start) * elec.unitPrice;
}
