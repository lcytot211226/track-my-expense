import mongoose, { Schema, type InferSchemaType } from "mongoose";

/**
 * 存錢罐:使用者替某個月設定想存下的金額。實際存下多少由 lib/summarizeMonth 依自己的當月結餘算出
 * = max(min(存錢前結餘, 金額), 0),計入當月支出,並寫進 OverviewSummary 快取的 piggyBank 欄位。
 */
const PiggyBankSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: String, required: true }, // "YYYY-MM"
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

PiggyBankSchema.index({ user: 1, period: 1 }, { unique: true });

export type PiggyBank = InferSchemaType<typeof PiggyBankSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.PiggyBank as mongoose.Model<InferSchemaType<typeof PiggyBankSchema>>) ||
  mongoose.model("PiggyBank", PiggyBankSchema);
