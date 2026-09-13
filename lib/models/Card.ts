import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CardSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    closingDate: { type: Number, required: true, min: 1, max: 31 },
    paymentDate: { type: Number, required: true, min: 1, max: 31 },
  },
  { timestamps: true }
);

CardSchema.index({ user: 1 });

export type Card = InferSchemaType<typeof CardSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.Card as mongoose.Model<InferSchemaType<typeof CardSchema>>) ||
  mongoose.model("Card", CardSchema);
