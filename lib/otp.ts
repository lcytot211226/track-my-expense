import crypto from "node:crypto";

/** 驗證碼(註冊啟用 / 忘記密碼共用)有效期限。 */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** 產生 6 位數字驗證碼,前導零補齊。 */
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}
