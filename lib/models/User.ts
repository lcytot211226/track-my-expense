import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createDate: { type: Date, required: true, default: Date.now },
    specialDate: { type: Number, min: 1, max: 31 },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.User as mongoose.Model<InferSchemaType<typeof UserSchema>>) ||
  mongoose.model("User", UserSchema);
