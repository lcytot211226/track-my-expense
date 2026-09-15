<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 個人記帳 Web App

一個使用 Next.js + MongoDB 打造的自訂記帳網站,支援信用卡分期管理、房租電費紀錄、單一入口登入驗證、深色/淺色模式,並具備 RWD 響應式設計(手機也能正常使用)。

## 技術棧

- **Framework**: Next.js (App Router),前後端皆使用 Next.js(API Routes / Route Handlers 作為後端)
- **Database**: MongoDB(建議使用 Mongoose 定義 Schema)
- **樣式**: Tailwind CSS(RWD + dark/light mode 都方便用 Tailwind 實作)
- **Auth**: 建議用簡單的 Credentials 驗證(bcrypt 加密密碼 + JWT / httpOnly cookie 做 session),不需要串第三方登入。可用 NextAuth.js 的 Credentials Provider,或自己寫一組輕量 auth middleware,皆可(規模小,兩種都行,由 Claude Code 挑一個實作)

## 環境變數

在專案根目錄建立 `.env.local`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority
JWT_SECRET=<自訂一組亂數字串,用於簽發登入 token>
EMAIL_KEY=<Resend API Key,用於寄送註冊 / 忘記密碼的驗證碼信件>
```

> 請勿將 `.env.local` 提交到 git,記得加入 `.gitignore`。

## 資料庫結構

共四個 collection:`User`、`Card`、`Transaction`、`Utility`(房租電費)。

### User(帳號)

```ts
{
  _id: ObjectId,
  email: string,          // 唯一
  password: string,       // bcrypt hash 過,不可存明文
  createDate: Date,       // 註冊時間
  specialDate: number,    // DD,1-31,用途待定(先保留欄位即可,例如未來可作為個人化的「月結算日」使用)
  emailVerified: boolean, // 是否已完成 email 驗證碼啟用,預設 false
  verificationCodeHash: string | null,   // 註冊啟用 / 忘記密碼共用的 6 碼驗證碼(bcrypt hash 過)
  verificationCodeExpires: Date | null,  // 驗證碼有效期限(10 分鐘)
  createdAt: Date,
  updatedAt: Date
}
```

> **註冊規則**:
> - 提供簡單的註冊頁面(email + password),不限制帳號數量
> - 註冊後用 Resend(`.env.local` 的 `EMAIL_KEY`)寄送 6 位數驗證碼到指定信箱,10 分鐘內輸入正確驗證碼(`/verify-email` 頁面)才會正式啟用帳號(`emailVerified = true`)
> - 帳號尚未啟用時嘗試登入,會自動導向 `/verify-email` 輸入驗證碼(可在該頁重新寄送)
> - 忘記密碼(`/forgot-password`):輸入 email 寄送驗證碼,驗證碼與新密碼一起送出後更新密碼,同時視為完成 email 驗證
> - 登入後用 JWT 存在 httpOnly cookie,所有頁面(除了 /login、/register、/verify-email、/forgot-password)都需要驗證身份,未登入導回 /login(單一入口的概念:全站都要先登入才能使用)

### Card(信用卡)

```ts
{
  _id: ObjectId,
  name: string,          // 卡片名稱,例如「國泰CUBE卡」
  closingDate: number,   // 結帳日,1-31
  paymentDate: number,   // 繳款日,1-31
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction(交易紀錄)

```ts
{
  _id: ObjectId,
  type: "income" | "expense",       // 收入 / 支出
  date: Date,                        // 實際交易發生日期
  category: "installment" | "cash" | "credit_card", // 付款方式:分期 / 現金 / 信用卡(單筆)
  item: string,                      // 項目名稱,例如「聚餐」「筆電分期」
  card: ObjectId | null,             // 關聯的信用卡(category 為 credit_card 或 installment 時使用),參照 Card._id
  installmentInfo: {                 // 僅 category = installment 時使用
    currentNumber: number,           // 目前第幾期
    totalNumber: number              // 總共幾期
  } | null,
  amount: number,                    // 金額
  posted: boolean,                   // 是否已在結帳日當下成功入帳(預設 true)。若為 false,代表結帳當下銀行還沒處理,要再往後遞延一個月
  billingPeriod: string,             // 計算後的歸屬月份,格式 "YYYY-MM",此筆交易會顯示在哪個月份頁面,由下方邏輯計算後存入(方便查詢,避免每次都要重算)
  createdAt: Date,
  updatedAt: Date
}
```

#### 「歸屬月份 (billingPeriod)」計算邏輯 — 重要

記帳頁面是以「這筆錢什麼時候實際入帳/繳費」為主,而不是單純以消費日期分類。規則如下:

1. **現金交易(category = "cash")**:不需要跑結帳邏輯,`billingPeriod` 直接等於交易日期所在的月份。

2. **信用卡 / 分期交易(category = "credit_card" 或 "installment")**,需要根據關聯卡片的 `closingDate` 與 `paymentDate` 計算:
   - **Step 1:找出這筆交易歸屬的「結帳週期」**
     - 若交易日的「日」 ≤ 卡片的 `closingDate`,則此交易算在「交易當月」的結帳週期內。
     - 若交易日的「日」 > 卡片的 `closingDate`,則此交易算在「交易下個月」的結帳週期內。
   - **Step 2:根據結帳週期,計算實際繳款月份**
     - 若卡片的 `paymentDate`(日)≤ `closingDate`(日),代表繳款日在結帳後的「下一個月」。
     - 若 `paymentDate` > `closingDate`,代表繳款日在「結帳當月」。
   - **Step 3:若 `posted = false`(該期結帳日當下未入帳),則在 Step 2 算出的月份基礎上,再往後遞延一個月。**
   - 最終算出的月份即為 `billingPeriod`。

   **範例**:8/10 消費,卡片 `closingDate=15`、`paymentDate=3`
   - Step 1:10 ≤ 15 → 結帳週期 = 8 月(8/15 結帳)
   - Step 2:paymentDate(3) ≤ closingDate(15) → 繳款月份 = 結帳月的下個月 = **9 月**
   - Step 3:若 `posted = true` → `billingPeriod = "2026-09"`;若 `posted = false`(15 號沒入帳)→ 再延一個月 → `billingPeriod = "2026-10"`

   建議把這段邏輯寫成一個獨立函式,例如 `lib/calculateBillingPeriod.ts`,在新增/編輯交易、或切換 `posted` 狀態時重新計算並更新 `billingPeriod` 欄位。

### Utility(房租電費)

```ts
{
  _id: ObjectId,
  year: number,          // 年份(建議額外加,方便查詢與跨年)
  month: number,         // 月份 1-12(建議額外加,原需求的 date:DD 可能是指帳單產生日,拆開比較好查)
  date: number,          // DD,帳單日期(原需求欄位)
  rent: number,          // 租金
  elec: {
    start: number,       // 電表起始度數
    end: number          // 電表結束度數
  },
  createdAt: Date,
  updatedAt: Date
}
```

> **假設**:原需求只有 `date: DD`,但這筆資料應該是每月一筆,所以我額外加了 `year` / `month` 方便對應到 `/overview` 的月份頁面與查詢。若你只需要「日」而不需要記錄年月,可以再跟 Claude Code 說移除。

## 頁面結構

| 路徑 | 說明 |
|---|---|
| `/login` | 登入頁 |
| `/register` | 註冊頁,不限制帳號數量 |
| `/verify-email` | 輸入註冊 / 忘記密碼驗證碼,啟用帳號 |
| `/forgot-password` | 忘記密碼:寄送驗證碼 + 設定新密碼 |
| `/` | 導覽頁,先留空(之後再補內容) |
| `/income` | 收入總覽(列表 + 篩選) |
| `/expense` | 支出總覽(列表 + 篩選) |
| `/overview` | 主要整合頁面,詳見下方說明 |
| `/cards` | 信用卡管理(新增/編輯/刪除) |

### `/overview` 頁面配置(由上到下)

1. **月份選擇器**:切換不同月份(對應 `billingPeriod` / Utility 的 year+month)
2. **Overview 圖表**:顯示該月份的收入 vs 支出圖表(例如長條圖或圓餅圖,呈現該月 `billingPeriod` 底下所有交易的收支狀況)
3. **Row 1 — 房租電費**:顯示該月的 `rent` 與 `elec`(start/end,並可算出用電度數),**可直接在此區塊內編輯並儲存**(inline edit,不需跳轉頁面)
4. **Row 2 — 收入 / 支出簡覽**:
   - 上方顯示該月 **Total**(收入總額、支出總額,或結餘)
   - 底下分別列出該月 income / expense 的簡易預覽(例如各列出最近幾筆)
   - 點擊該區塊可導向對應的 `/income` 或 `/expense` 頁面查看完整列表

## 深色 / 淺色模式(Dark / Light Mode)

- 提供切換按鈕(建議放在 Navbar)
- 記住使用者偏好(localStorage,或跟隨系統 `prefers-color-scheme`)
- Tailwind 設定 `darkMode: 'class'`

## RWD(響應式設計)

- **不做 PWA**,純粹是網頁響應式設計,確保手機瀏覽器開啟也能正常操作(記帳情境常常會用手機隨手記錄)
- 使用 Tailwind 的響應式 class(`sm: md: lg:`)確保手機/平板/桌面都能正常顯示
- `/overview` 的圖表、row 區塊在手機上應改為單欄堆疊排版

## 建議專案結構

```
/app
  /login/page.tsx
  /register/page.tsx
  /api
    /auth
      /login/route.ts
      /register/route.ts
    /cards
      route.ts
      /[id]/route.ts
    /transactions
      route.ts
      /[id]/route.ts
    /utilities
      route.ts
      /[id]/route.ts
  /cards
    page.tsx
  /income
    page.tsx
  /expense
    page.tsx
  /overview
    page.tsx
  layout.tsx
  page.tsx                 // 導覽頁,先留空
/lib
  mongodb.ts                // 資料庫連線
  auth.ts                   // 登入驗證 / JWT 相關函式,middleware 保護頁面
  calculateBillingPeriod.ts // 歸屬月份計算邏輯
  models/
    User.ts
    Card.ts
    Transaction.ts
    Utility.ts
/components
  Navbar.tsx
  ThemeToggle.tsx
  TransactionForm.tsx
  CardForm.tsx
  UtilityInlineEditor.tsx
  MonthPicker.tsx
  OverviewChart.tsx
middleware.ts               // 未登入導回 /login
```

## 給 Claude Code 的實作指示

請依照以下順序實作:

1. 初始化 Next.js 專案(App Router、TypeScript、Tailwind CSS)
2. 設定 MongoDB 連線(`lib/mongodb.ts`,讀取 `.env.local` 的 `MONGODB_URI`)
3. 定義 Mongoose Schema:`User`、`Card`、`Transaction`、`Utility`
4. 實作 Auth:
   - 註冊 API(檢查帳號上限 2 個、bcrypt hash 密碼)
   - 登入 API(驗證帳密、簽發 JWT、存入 httpOnly cookie)
   - `middleware.ts`:保護所有頁面(除了 /login、/register),未登入則導向 /login
5. 實作 `calculateBillingPeriod.ts`,依上述規則計算交易的歸屬月份
6. 實作 API Routes:Card / Transaction / Utility 的 CRUD
7. 實作前端頁面:
   - `/login`、`/register`
   - `/`(先留空白頁即可)
   - `/cards`
   - `/income`、`/expense`(列表 + 篩選)
   - `/overview`(月份選擇器 + 圖表 + 房租電費 inline 編輯 + 收支簡覽 + Total)
8. 實作 Dark/Light mode 切換
9. 確保 RWD,手機瀏覽正常

## 待確認事項

- `User.specialDate` 目前用途不明確,先保留欄位,之後若有明確用途(例如個人化月結算日)再補邏輯
- 是否需要消費分類(如餐飲、交通、娛樂)統計圖表,目前先以 income/expense 兩大類呈現