import mongoose, { Schema, type InferSchemaType } from "mongoose";

/** 對帳進度:已對帳 → 已繳費。「未對帳」不存狀態,直接用「沒有這筆紀錄」表示。 */
export const CARD_RECONCILIATION_STATUSES = ["reconciled", "paid"] as const;
export type CardReconciliationStatus = (typeof CARD_RECONCILIATION_STATUSES)[number];

/** 一筆紀錄代表「這張卡在這個月已經對過帳(或更進一步已繳費)」;不存在就是尚未對帳。 */
const CardReconciliationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    card: { type: Schema.Types.ObjectId, ref: "Card", required: true },
    period: { type: String, required: true }, // "YYYY-MM"
    // 舊資料沒有這個欄位,一律視為 "reconciled"
    status: { type: String, enum: CARD_RECONCILIATION_STATUSES, default: "reconciled" },
  },
  { timestamps: true }
);

CardReconciliationSchema.index({ user: 1, card: 1, period: 1 }, { unique: true });

export type CardReconciliation = InferSchemaType<typeof CardReconciliationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default (mongoose.models.CardReconciliation as mongoose.Model<
  InferSchemaType<typeof CardReconciliationSchema>
>) || mongoose.model("CardReconciliation", CardReconciliationSchema);
