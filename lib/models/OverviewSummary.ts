import mongoose, { Schema, type InferSchemaType } from "mongoose";

/**
 * 每個使用者、每個 billingPeriod 一份的彙總快取,取代 /overview 每次都要重新拉整個月原始資料再加總。
 * 交易/水電/自訂項目異動時由對應的 API route 呼叫 lib/recomputeOverviewSummary 重新計算並覆寫。
 */
const OverviewSummarySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: String, required: true }, // "YYYY-MM"
    income: { type: Number, required: true, default: 0 },
    // 支出總額(現金+分期+信用卡單筆交易 + 房租水電 + 自訂項目)
    expense: { type: Number, required: true, default: 0 },
    cash: { type: Number, required: true, default: 0 },
    installment: { type: Number, required: true, default: 0 },
    subscription: { type: Number, required: true, default: 0 },
    utility: { type: Number, required: true, default: 0 },
    customItems: { type: Number, required: true, default: 0 },
    balance: { type: Number, required: true, default: 0 },
    cards: {
      type: [
        new Schema(
          {
            card: { type: Schema.Types.ObjectId, ref: "Card", required: true },
            total: { type: Number, required: true, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // 可自由選取拿去分享給別人的項目快照(key + 金額);label 一律由 API 層依 key 即時解析,
    // 避免卡片改名之後,舊快照裡存的名稱跟著過期。
    items: {
      type: [
        new Schema(
          {
            key: { type: String, required: true },
            amount: { type: Number, required: true, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

OverviewSummarySchema.index({ user: 1, period: 1 }, { unique: true });

export type OverviewSummary = InferSchemaType<typeof OverviewSummarySchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.OverviewSummary as mongoose.Model<InferSchemaType<typeof OverviewSummarySchema>>) ||
  mongoose.model("OverviewSummary", OverviewSummarySchema);
