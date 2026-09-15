// 一次性 migration:把「加入 email 驗證機制之前」就存在的帳號標記為已驗證,
// 避免它們因為新加的 emailVerified 欄位預設 false 而被擋在登入頁外。
//
// 只會動到「資料庫裡真的沒有 emailVerified 這個欄位」的舊帳號({ $exists: false }是看
// 實際儲存的文件,不受 Mongoose schema 預設值影響),不會影響之後透過新註冊流程建立、
// 已經明確存有 emailVerified: false 的帳號。
//
// 使用方式:node scripts/migrate-verify-existing-users.mjs
import mongoose from "mongoose";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
      }
    }
  } catch {
    // 若 .env.local 不存在就靠既有的環境變數
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
const User = mongoose.connection.collection("users");

const legacyUsers = await User.find({ emailVerified: { $exists: false } }, { projection: { email: 1 } }).toArray();
console.log(
  "即將標記為已驗證的舊帳號:",
  legacyUsers.map((u) => u.email)
);

const result = await User.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } });
console.log(`已更新 ${result.modifiedCount} 筆帳號`);

await mongoose.disconnect();
