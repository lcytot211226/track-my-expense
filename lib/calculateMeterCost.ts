export type MeterInfo = {
  start: number;
  end: number;
  unitPrice: number;
  manualAmount: number | null;
};

/**
 * 電費/水費的實際金額(可能有小數,只給畫面顯示用):預設用 (表值結束-起始) × 單價計算;
 * 若使用者直接輸入帳單金額(manualAmount 有值),則以該金額為準,略過度數計算。
 */
export function calculateMeterCostExact(meter: MeterInfo): number {
  if (meter.manualAmount !== null && meter.manualAmount !== undefined) {
    return meter.manualAmount;
  }
  return Math.max(0, meter.end - meter.start) * meter.unitPrice;
}

/** 計入統計(lib/summarizeMonth、房租水電總額)的電費/水費金額,一律四捨五入到整數。 */
export function calculateMeterCost(meter: MeterInfo): number {
  return Math.round(calculateMeterCostExact(meter));
}
