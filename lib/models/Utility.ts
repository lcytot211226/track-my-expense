import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UtilitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    date: { type: Number, required: true, min: 1, max: 31 },
    rent: { type: Number, required: true, default: 0 },
    elec: {
      type: new Schema(
        {
          start: { type: Number, required: true, default: 0 },
          end: { type: Number, required: true, default: 0 },
          unitPrice: { type: Number, required: true, default: 0 },
          manualAmount: { type: Number, default: null },
        },
        { _id: false }
      ),
      required: true,
    },
  },
  { timestamps: true }
);

UtilitySchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

export type Utility = InferSchemaType<typeof UtilitySchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.Utility as mongoose.Model<InferSchemaType<typeof UtilitySchema>>) ||
  mongoose.model("Utility", UtilitySchema);
