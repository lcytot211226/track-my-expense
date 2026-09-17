import mongoose, { Schema, type InferSchemaType } from "mongoose";

/**
 * 使用者把自己 OverviewSummary 裡的某個項目(例如某張卡的刷卡總額、房租水電總開銷)
 * 設定共享給某個 email(不需要對方已註冊);對方登入後可在自己的 /overview 看到這筆分享,
 * 並自行決定 included 要不要把金額納入自己的支出計算,原始資料仍歸屬分享者。
 */
const ShareSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetEmail: { type: String, required: true },
    // "cash" | "installment" | "subscription" | "utility" | "customItems" | "card:<cardId>"
    itemKey: { type: String, required: true },
    included: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

ShareSchema.index({ owner: 1, targetEmail: 1, itemKey: 1 }, { unique: true });
ShareSchema.index({ targetEmail: 1 });

export type Share = InferSchemaType<typeof ShareSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.Share as mongoose.Model<InferSchemaType<typeof ShareSchema>>) ||
  mongoose.model("Share", ShareSchema);
