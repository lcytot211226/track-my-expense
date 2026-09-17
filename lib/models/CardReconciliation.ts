import mongoose, { Schema, type InferSchemaType } from "mongoose";

/** 一筆紀錄代表「這張卡在這個月已經對過帳」;不存在就是尚未對帳,不需要額外的布林欄位。 */
const CardReconciliationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    card: { type: Schema.Types.ObjectId, ref: "Card", required: true },
    period: { type: String, required: true }, // "YYYY-MM"
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
