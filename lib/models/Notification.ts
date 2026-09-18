import mongoose, { Schema, type InferSchemaType } from "mongoose";

/** 系統公告,全部使用者共用同一份資料,只有主題(title)跟內容(content)。 */
const NotificationSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export type Notification = InferSchemaType<typeof NotificationSchema> & { _id: mongoose.Types.ObjectId };

export default (mongoose.models.Notification as mongoose.Model<InferSchemaType<typeof NotificationSchema>>) ||
  mongoose.model("Notification", NotificationSchema);
