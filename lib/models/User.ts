import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createDate: { type: Date, required: true, default: Date.now },
    specialDate: { type: Number, min: 1, max: 31 },
    emailVerified: { type: Boolean, required: true, default: false },
    /** 註冊啟用 / 忘記密碼共用的 6 碼驗證碼(bcrypt hash 過),驗證成功或過期後清空。 */
    verificationCodeHash: { type: String, default: null },
    verificationCodeExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.User as mongoose.Model<InferSchemaType<typeof UserSchema>>) ||
  mongoose.model("User", UserSchema);
