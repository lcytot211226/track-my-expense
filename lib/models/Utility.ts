import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UtilitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    date: { type: Number, required: true, min: 1, max: 31 },
    rent: { type: Number, required: true, default: 0 },
    // 租金/電費/水費是否要算進「房租水電總開銷」及上方支出/結餘統計,分開存、跟著月份走。
    rentEnabled: { type: Boolean, required: true, default: true },
    elecEnabled: { type: Boolean, required: true, default: true },
    waterEnabled: { type: Boolean, required: true, default: true },
    // 總開關:只影響顯示/統計要不要把這個月的房租水電算進去,不會動到上面三個個別開關,
    // 關掉再打開時,租金/電費/水費原本各自的開關狀態都還在。
    enabled: { type: Boolean, required: true, default: true },
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
    water: {
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
      default: () => ({ start: 0, end: 0, unitPrice: 0, manualAmount: null }),
    },
  },
  { timestamps: true }
);

UtilitySchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

export type Utility = InferSchemaType<typeof UtilitySchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.Utility as mongoose.Model<InferSchemaType<typeof UtilitySchema>>) ||
  mongoose.model("Utility", UtilitySchema);
