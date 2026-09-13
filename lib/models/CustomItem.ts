import mongoose, { Schema, type InferSchemaType } from "mongoose";

/** 使用者自訂的月費項目,例如「孝親費」,不是每個月都一定會有,由使用者自行決定該月要不要新增。 */
const CustomItemSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    name: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

CustomItemSchema.index({ user: 1, year: 1, month: 1 });

export type CustomItem = InferSchemaType<typeof CustomItemSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.CustomItem as mongoose.Model<InferSchemaType<typeof CustomItemSchema>>) ||
  mongoose.model("CustomItem", CustomItemSchema);
