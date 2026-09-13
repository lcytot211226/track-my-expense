import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    date: { type: Date, required: true },
    category: {
      type: String,
      enum: ["installment", "cash", "credit_card"],
      required: true,
    },
    item: { type: String, required: true },
    card: { type: Schema.Types.ObjectId, ref: "Card", default: null },
    installmentInfo: {
      type: new Schema(
        {
          currentNumber: { type: Number, required: true },
          totalNumber: { type: Number, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    amount: { type: Number, required: true },
    posted: { type: Boolean, required: true, default: true },
    billingPeriod: { type: String, required: true },
    /** 同一筆分期購買一次生成的所有期數共用這個 id,刪除時整組一起刪。 */
    installmentGroupId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, billingPeriod: 1 });
TransactionSchema.index({ user: 1, installmentGroupId: 1 });

export type Transaction = InferSchemaType<typeof TransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default (mongoose.models.Transaction as mongoose.Model<
  InferSchemaType<typeof TransactionSchema>
>) || mongoose.model("Transaction", TransactionSchema);
