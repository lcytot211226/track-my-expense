<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 個人記帳 Web App

一個使用 Next.js + MongoDB 打造的自訂記帳網站。核心是信用卡分期/訂閱扣款管理與房租水電紀錄,並延伸出訂閱惰性生成交易、跨帳號項目分享、系統公告通知、信用卡對帳追蹤、每日可花預算等功能;具備單一入口登入驗證、深色/淺色模式與 RWD 響應式設計(手機也能正常使用)。

> 本節(技術棧以下)是「現況文件」,會隨程式碼一起維護,反映目前實際的實作,而不是最初的需求規格。

## 技術棧

- **Framework**: Next.js (App Router),前後端皆使用 Next.js(API Routes / Route Handlers 作為後端)。這個版本的 Next.js 用 `proxy.ts`(而非傳統的 `middleware.ts`)實作請求層攔截,細節見下方「認證與存取控制」。
- **Database**: MongoDB,透過 Mongoose 定義 Schema(`lib/models/*.ts`)
- **樣式**: Tailwind CSS(RWD + dark/light mode)
- **Auth**: 自寫的輕量 Credentials 驗證(`lib/auth.ts`):bcryptjs 雜湊密碼、`jose` 簽發/驗證 JWT,存在 httpOnly cookie 做 session,沒有串接 NextAuth.js 或任何第三方登入
- **Email**: Resend(`lib/email.ts`),寄送註冊 / 忘記密碼的 6 碼驗證碼
- **圖表**: Recharts(`components/OverviewChart.tsx`)

## 環境變數

在專案根目錄建立 `.env.local`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority
JWT_SECRET=<自訂一組亂數字串,用於簽發登入 token>
EMAIL_KEY=<Resend API Key,用於寄送註冊 / 忘記密碼的驗證碼信件>
```

> 請勿將 `.env.local` 提交到 git(已加入 `.gitignore`)。
>
> 管理員帳號(唯一能使用 `/admin` 後台發布系統公告的帳號)是寫死在 `lib/auth.ts` 的 `ADMIN_EMAIL` 常數,不是環境變數;要換人需要直接改程式碼。

## 認證與存取控制

- 密碼一律用 `bcryptjs` 雜湊(`hashPassword`/`verifyPassword`),絕不存明文。
- 登入成功後用 `jose` 簽發 JWT(payload 只有 `email`,`sub` 放 `userId`),存進名為 `auth_token` 的 httpOnly cookie,效期 30 天。
- `proxy.ts`(取代舊版 Next.js 的 `middleware.ts`)攔截除了 `/`、`/login`、`/register`、`/verify-email`、`/forgot-password` 以外的所有頁面請求:沒有合法 token 就導回 `/login`;驗證通過則**每次請求都重新簽發 cookie**,達成 sliding session——只要 30 天內有造訪過就會一直維持登入,不需要手動重新登入。`proxy.ts` 的 `matcher` 排除了 `/api/**`,所以 API 路由各自呼叫 `requireAuth()`/`getCurrentUser()`(`lib/auth.ts`)檢查登入狀態,未登入回傳 401。
- 帳號啟用前(`emailVerified = false`)無法登入,登入 API 會回傳 `403 + needsVerification: true`,前端導向 `/verify-email`。
- `/admin` 底下的頁面與 `app/api/admin/**` 的 API,除了要登入以外還要求 `email === ADMIN_EMAIL`,否則導回 `/overview`(頁面)或回傳 403(API)。
- 註冊**不限制帳號數量**,任何 email 都可以註冊。

## 資料庫結構

共十個 collection:`User`、`Card`、`Transaction`、`Subscription`、`Utility`、`CustomItem`、`CardReconciliation`、`OverviewSummary`、`Share`、`Notification`。除了 `User` 和全站共用的 `Notification` 外,其餘每個 collection 都有 `user`(`ObjectId`,參照 `User._id`)欄位做資料隔離,所有 API 查詢也一律加上 `user: auth.userId` 條件,確保使用者只能讀寫自己的資料。

### User(帳號)

```ts
{
  _id: ObjectId,
  email: string,          // 唯一
  password: string,       // bcrypt hash 過,不可存明文
  createDate: Date,       // 註冊時間
  specialDate: number | undefined, // DD,1-31,使用者自訂的「月結算日」(選填);/settings 可設定/清除
  emailVerified: boolean, // 是否已完成 email 驗證碼啟用,預設 false
  verificationCodeHash: string | null,   // 註冊啟用 / 忘記密碼共用的 6 碼驗證碼(bcrypt hash 過),驗證成功或過期後清空
  verificationCodeExpires: Date | null,  // 驗證碼有效期限(10 分鐘)
  notificationRead: boolean, // 是否已讀最新一則系統公告,預設 true;管理員發布新公告時全體使用者會被重置為 false
  createdAt: Date,
  updatedAt: Date
}
```

> **註冊規則**:
> - 提供簡單的註冊頁面(email + password),不限制帳號數量
> - 註冊後用 Resend(`.env.local` 的 `EMAIL_KEY`)寄送 6 位數驗證碼到指定信箱,10 分鐘內輸入正確驗證碼(`/verify-email` 頁面)才會正式啟用帳號(`emailVerified = true`)。同一 email 若尚未啟用就重新註冊,視為重寄驗證碼並套用新密碼,不會擋下來。
> - 帳號尚未啟用時嘗試登入,會回傳 `403 + needsVerification: true`,前端自動導向 `/verify-email` 輸入驗證碼(可在該頁重新寄送)
> - 忘記密碼(`/forgot-password`):輸入 email 寄送驗證碼,驗證碼與新密碼一起送出後更新密碼,同時視為完成 email 驗證。無論帳號是否存在都回傳成功,避免洩漏 email 是否已註冊。
> - 登入後用 JWT 存在 httpOnly cookie(sliding session,見上方「認證與存取控制」),所有頁面(除了 `/`、`/login`、`/register`、`/verify-email`、`/forgot-password`)都需要驗證身份,未登入導回 `/login`
> - `specialDate`(月結算日)的實際用途:`/overview` 用它算出「距離下次結算日還有幾天」,再用「本月結餘 ÷ 剩餘天數」算出每日可花預算(`lib/calculateDailyBudget.ts`),沒設定就不顯示這個區塊。

### Card(信用卡)

```ts
{
  _id: ObjectId,
  user: ObjectId,         // 參照 User._id
  name: string,           // 卡片名稱,例如「國泰CUBE卡」
  closingDate: number,    // 結帳日,1-31
  paymentDate: number,    // 繳款日,1-31
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction(交易紀錄)

```ts
{
  _id: ObjectId,
  user: ObjectId,                    // 參照 User._id
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
  installmentGroupId: ObjectId | null, // 同一次分期購買生成的所有期數共用同一個 id,刪除其中一期會整組一起刪
  subscription: ObjectId | null,     // 若此筆是由訂閱惰性生成,記錄來源 Subscription._id;之後訂閱被編輯/刪除都不會回頭修改這筆
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

   這段邏輯實作在 `lib/calculateBillingPeriod.ts` 的 `calculateBillingPeriod()`,在新增/編輯交易、切換 `posted` 狀態、生成分期或訂閱交易時都會重新呼叫並存回 `billingPeriod` 欄位。

### Subscription(訂閱 / 固定月付項目)

```ts
{
  _id: ObjectId,
  user: ObjectId,
  item: string,                      // 項目名稱,例如「Netflix」「房間清潔訂閱」
  amount: number,
  category: "cash" | "credit_card",  // 訂閱不支援分期
  card: ObjectId | null,             // category = credit_card 時使用,參照 Card._id
  startDate: Date,                   // 首次扣款日期,之後每月同一天重複扣款(短月自動夾到月底)
  lastGeneratedDate: Date | null,    // 已經生成到哪一次扣款日,避免重複生成
  createdAt: Date,
  updatedAt: Date
}
```

> **惰性生成邏輯**(`lib/generateSubscriptionTransactions.ts` 的 `generateDueSubscriptionTransactions()`):不是用排程/cron 定期產生交易,而是每次讀取交易列表(`GET /api/transactions`)、或新增/編輯/刪除訂閱時觸發——把每個訂閱從 `lastGeneratedDate` 之後、到「今天」為止已經到期的每個月扣款,依序補生成成真正的 `Transaction`(`type: "expense"`,`subscription` 欄位指向來源訂閱),並用 `calculateBillingPeriod` 算出各期的 `billingPeriod`。每期日期一律用 `addMonthsClamped(startDate, k)` 從原始 `startDate` 重新推算,而不是拿上一期日期繼續往後加一個月,避免「1/31 訂閱在 2 月被夾到 28 號後,之後每個月都回不去 31 號」的日期漂移問題。訂閱之後被編輯或刪除,已經生成出來的交易都是獨立紀錄,不會被回頭改動或刪除。

### Utility(房租電費)

```ts
{
  _id: ObjectId,
  user: ObjectId,
  year: number,           // 年份
  month: number,          // 月份 1-12
  date: number,           // DD,帳單日期
  rent: number,           // 租金
  rentEnabled: boolean,   // 租金是否計入本月統計,預設 true
  elecEnabled: boolean,   // 電費是否計入本月統計,預設 true
  waterEnabled: boolean,  // 水費是否計入本月統計,預設 true
  enabled: boolean,       // 總開關:關閉時本月房租水電完全不計入統計,但不影響/清空上面三個個別開關,重新打開會恢復原狀
  elec: {
    start: number,        // 電表起始度數
    end: number,          // 電表結束度數
    unitPrice: number,    // 每度單價
    manualAmount: number | null // 若有值則直接以此金額為準,略過度數 × 單價的計算
  },
  water: {                // 結構同 elec,水費
    start: number,
    end: number,
    unitPrice: number,
    manualAmount: number | null
  },
  createdAt: Date,
  updatedAt: Date
}
```

> 每個 `(user, year, month)` 只會有一筆(unique index),`/overview` 的房租水電 inline 編輯是用 `PUT /api/utilities`(不帶 id,依 year+month upsert)整份覆寫。金額計算見 `lib/calculateMeterCost.ts`:`manualAmount` 有值就直接用它,否則用 `max(0, end - start) × unitPrice`。

### CustomItem(自訂月費項目)

```ts
{
  _id: ObjectId,
  user: ObjectId,
  year: number,
  month: number,   // 1-12
  name: string,    // 例如「孝親費」
  amount: number,
  createdAt: Date,
  updatedAt: Date
}
```

> 使用者自行決定某個月要不要新增,不是每月固定存在的項目,用來記錄不方便歸類成一般交易或訂閱的月費開銷,計入該月支出總額。

### CardReconciliation(信用卡對帳紀錄)

```ts
{
  _id: ObjectId,
  user: ObjectId,
  card: ObjectId,  // 參照 Card._id
  period: string,  // "YYYY-MM"
  createdAt: Date,
  updatedAt: Date
}
```

> 純粹用「這筆紀錄存不存在」表示某張卡在某個月是否已經對帳完成,不需要額外的布林欄位;`(user, card, period)` 是 unique index。取消對帳就直接刪掉這筆紀錄。

### OverviewSummary(每月彙總快取)

```ts
{
  _id: ObjectId,
  user: ObjectId,
  period: string,      // "YYYY-MM"
  income: number,
  expense: number,     // 現金 + 分期 + 信用卡單筆交易 + 房租水電 + 自訂項目
  cash: number,
  installment: number,
  subscription: number,
  utility: number,
  customItems: number,
  balance: number,     // income - expense
  cards: [{ card: ObjectId, total: number }],  // 每張信用卡當月刷卡總額
  items: [{ key: string, amount: number }],    // 可分享項目快照,key 見下方 Share 說明
  createdAt: Date,
  updatedAt: Date
}
```

> `(user, period)` 是 unique index。這是一份**衍生/快取資料**,不是使用者直接輸入的來源資料——交易、房租水電、自訂項目任何一筆異動,對應 API route 都會呼叫 `lib/recomputeOverviewSummary.ts` 的 `recomputeOverviewSummary(userId, period)` 重新從原始資料算一次並整份覆寫,讓 `GET /api/overview-summary` 可以直接讀快取,不用每次都重新拉整個月資料加總;若某個月從未被計算過(沒有快取),讀取時會即時算一次並補上。`items` 裡的 `key` 只存代碼(例如 `"cash"`、`"card:<cardId>"`),顯示用的 label 一律由 API 層透過 `lib/overviewItems.ts` 的 `labelForItemKey()` 依 key 即時解析,避免卡片改名後舊快照裡的名稱跟著過期。

### Share(跨帳號項目分享)

```ts
{
  _id: ObjectId,
  owner: ObjectId,       // 分享者,參照 User._id
  targetEmail: string,   // 收件人 email,不需要對方已註冊
  itemKey: string,       // "cash" | "installment" | "subscription" | "utility" | "customItems" | "card:<cardId>"
  included: boolean,     // 收件人是否選擇把這筆分享納入自己的支出統計,預設 false
  createdAt: Date,
  updatedAt: Date
}
```

> `(owner, targetEmail, itemKey)` 是 unique index。分享者把自己 `OverviewSummary` 裡某個固定項目(收入/支出/結餘/現金/分期/訂閱/房租水電/自訂項目)或某張信用卡的當月總額分享給任一 email;原始資料仍歸屬分享者,收件人登入後在自己的 `/overview` 看到這筆分享,可自行決定 `included` 要不要把金額納入自己的支出計算(不會真的寫成一筆交易,純粹是顯示/統計層的虛擬項目)。金額不落地存放,`GET /api/shares/incoming` 每次都即時從分享者當月的 `OverviewSummary` 讀取,永遠反映最新狀態。分享項目納入收件人支出時的實際貢獻值見 `lib/overviewItems.ts` 的 `sharedItemContribution()`:`balance` 一律不計入(避免重複計算),`income` 要反轉正負號(對「支出」而言是負向貢獻),其餘維持原本金額。

### Notification(系統公告)

```ts
{
  _id: ObjectId,
  title: string,
  content: string,
  createdAt: Date,
  updatedAt: Date
}
```

> 全站共用同一份資料,沒有 `user` 欄位。只有 `ADMIN_EMAIL` 這個帳號能透過 `/admin/notification` 發布/編輯/刪除;每次發布新公告都會把所有 `User.notificationRead` 重置為 `false`,讓 Navbar 的通知鈴鐺顯示未讀提示。

## API Routes

除了 `/api/auth/register`、`/api/auth/login`、`/api/auth/logout`、`/api/auth/verify-email`、`/api/auth/resend-code`、`/api/auth/forgot-password`、`/api/auth/reset-password` 以外,以下所有 API 都要求已登入(`requireAuth()`,未登入回傳 `401`),而且查詢/寫入一律加上 `user: auth.userId` 條件做資料隔離。標「Admin」的另外要求 `email === ADMIN_EMAIL`(否則回傳 `403`)。

### 認證 `/api/auth`

| Method / 路徑 | 說明 |
|---|---|
| `POST /api/auth/register` | `{ email, password }`,建立(或重用尚未啟用的既有)帳號並寄送 6 碼驗證碼,不限制帳號數量 |
| `POST /api/auth/login` | `{ email, password }`,帳密錯誤回 401;帳號未啟用回 `403 + needsVerification`;成功則簽發 JWT 存入 httpOnly cookie |
| `POST /api/auth/logout` | 清除登入 cookie |
| `GET /api/auth/me` | 回傳 `{ email, specialDate, isAdmin }` |
| `PATCH /api/auth/me` | `{ specialDate: number\|null }`,設定或清除月結算日(1-31) |
| `POST /api/auth/verify-email` | `{ email, code }`,驗證成功後 `emailVerified = true` |
| `POST /api/auth/resend-code` | `{ email }`,重新寄送註冊驗證碼(僅限尚未啟用的帳號) |
| `POST /api/auth/forgot-password` | `{ email }`,寄送重設密碼驗證碼;帳號不存在也回傳成功 |
| `POST /api/auth/reset-password` | `{ email, code, newPassword }`,驗證碼正確就更新密碼,並視為完成 email 驗證 |
| `POST /api/auth/change-password` | `{ currentPassword, newPassword }`,需先驗證目前密碼 |
| `POST /api/auth/delete-account` | `{ password }`,驗證密碼後刪除帳號本身,以及該使用者名下所有 Card / Transaction / Utility / CustomItem / OverviewSummary / Share(owner) 資料 |

### 信用卡 `/api/cards`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/cards` | 列出我的所有卡片 |
| `POST /api/cards` | `{ name, closingDate, paymentDate }` 新增 |
| `GET/PUT/DELETE /api/cards/[id]` | 讀取/更新/刪除單張卡片 |

### 交易 `/api/transactions`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/transactions` | 支援 `?type=&billingPeriod=&category=&card=` 篩選;查 `category=credit_card` 時會一併帶出 `installment`(分期本質上也是刷卡)。**讀取前一律先呼叫 `generateDueSubscriptionTransactions()` 補生成到期的訂閱交易**,確保 `/income`、`/expense`、`/overview` 永遠看得到最新結果 |
| `POST /api/transactions` | 建立單筆交易(現金/信用卡單筆);自動用 `calculateBillingPeriod()` 算出 `billingPeriod` 並存入,同時觸發 `recomputeOverviewSummary` |
| `GET/PUT/DELETE /api/transactions/[id]` | 更新時若新舊 `billingPeriod` 不同,新舊兩個月份的彙總都會重算;刪除若該筆有 `installmentGroupId`,會把同一組所有期數一起刪除並重算受影響的每個月份 |
| `POST /api/transactions/installment` | `{ item, date, card, totalAmount, totalNumber }`,一次生成整組分期交易,共用同一個 `installmentGroupId`;金額除不盡的餘數放在第一期,其餘各期平分 |

### 訂閱 `/api/subscriptions`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/subscriptions` | 列出我的所有訂閱 |
| `POST /api/subscriptions` | `{ item, amount, category, card?, startDate }`,建立後立刻呼叫惰性生成,補齊已到期的部分 |
| `PUT /api/subscriptions/[id]` | 只改訂閱設定本身(不動 `lastGeneratedDate`),已生成的交易不受影響,新設定只套用在之後新生成的期數 |
| `DELETE /api/subscriptions/[id]` | 只刪訂閱設定,停止之後繼續生成;已生成的交易是獨立紀錄,不會被連帶刪除 |

### 房租水電 `/api/utilities`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/utilities` | 支援 `?year=&month=` 篩選 |
| `POST /api/utilities` | 新增一筆 |
| `PUT /api/utilities` | 不帶 id,依 `{ year, month }` upsert,供 `/overview` inline edit 使用,前端一律送整份資料覆寫 |
| `GET/PUT/DELETE /api/utilities/[id]` | 讀取/更新/刪除單筆,更新若 `year`/`month` 改變,新舊月份的彙總都會重算 |

### 自訂項目 `/api/custom-items`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/custom-items` | 支援 `?year=&month=` 篩選 |
| `POST /api/custom-items` | `{ year, month, name, amount }` 新增 |
| `PUT/DELETE /api/custom-items/[id]` | 更新/刪除 |

### 信用卡對帳 `/api/card-reconciliations`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/card-reconciliations?period=` | 回傳該月已對帳的卡片 id 列表 |
| `PUT /api/card-reconciliations` | `{ card, period, reconciled }`,`reconciled: true` 建立紀錄、`false` 刪除紀錄 |

### 月度彙總 `/api/overview-summary`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/overview-summary?period=` | 讀取(不存在則即時計算並寫入)`OverviewSummary` 快取,回傳收支各分類總額、每張卡當月刷卡總額(含當月完全沒刷卡的卡片,顯示 $0)、以及可分享項目清單(附上解析後的中文 label) |

### 分享 `/api/shares`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/shares` | 我(分享者)設定過的分享清單 |
| `POST /api/shares` | `{ targetEmail, itemKeys: string[] }`,把一個或多個項目分享給某個 email(不能分享給自己) |
| `PUT /api/shares/[id]` | `{ included }`,僅收件人(`targetEmail` 對得上自己 email)可呼叫,決定要不要把這筆分享納入自己的支出計算 |
| `DELETE /api/shares/[id]` | 僅分享者(`owner`)可呼叫,取消分享 |
| `GET /api/shares/incoming?period=` | 別人分享給我的項目,金額即時從各分享者當月的 `OverviewSummary` 讀出 |

### 系統通知 `/api/notifications`

| Method / 路徑 | 說明 |
|---|---|
| `GET /api/notifications` | 導覽列鈴鐺用,固定回傳最新 3 則公告,以及我是否已讀 |
| `POST /api/notifications/mark-read` | 把我的已讀狀態設為已讀 |
| `GET/POST /api/admin/notifications` **(Admin)** | 列出(預設 10 筆,`?limit=` 最多 100)/ 發布新公告(`{ title, content }`,發布後重置所有使用者已讀狀態) |
| `PUT/DELETE /api/admin/notifications/[id]` **(Admin)** | 編輯 / 刪除一則公告 |

## 頁面結構

| 路徑 | 說明 |
|---|---|
| `/login` | 登入頁 |
| `/register` | 註冊頁,不限制帳號數量 |
| `/verify-email` | 輸入註冊 / 忘記密碼驗證碼,啟用帳號 |
| `/forgot-password` | 忘記密碼:寄送驗證碼 + 設定新密碼 |
| `/` | 未登入可見的介紹頁(用 `lib/demoData.ts` 的假資料展示功能,不接資料庫) |
| `/income` | 收入總覽(列表 + 篩選) |
| `/expense` | 支出總覽(列表 + 篩選),含信用卡分期、訂閱管理入口與信用卡對帳標記 |
| `/overview` | 主要整合頁面,詳見下方說明 |
| `/cards` | 信用卡管理(新增/編輯/刪除) |
| `/settings` | 個人設定:月結算日(`specialDate`)、修改密碼、刪除帳號 |
| `/admin`、`/admin/notification` | 僅 `ADMIN_EMAIL` 可進入,發布/編輯/刪除系統公告 |

### `/overview` 頁面配置(由上到下)

1. **月份選擇器**:切換不同月份(對應 `billingPeriod` / Utility 的 year+month)
2. **Overview 圖表**:用 Recharts 顯示該月份的收入 vs 支出圖表,呈現該月 `billingPeriod` 底下所有交易的收支狀況
3. **每日可花預算**:若使用者在 `/settings` 設定了月結算日(`specialDate`),顯示距離下次結算日還有幾天,以及「本月結餘 ÷ 剩餘天數」算出的每日可花預算(`lib/calculateDailyBudget.ts`);沒設定則不顯示
4. **Row 1 — 房租電費**:顯示該月的租金與電費/水費(各自 start/end/單價或手動輸入金額,並可算出用量與費用),租金/電費/水費/總開關可個別開關是否計入統計,**可直接在此區塊內編輯並儲存**(inline edit,不需跳轉頁面)
5. **Row 2 — 收入 / 支出簡覽**:
   - 上方顯示該月 **Total**(收入總額、支出總額、結餘),以及現金/分期/訂閱/自訂項目/各張信用卡的分項總額
   - 每張信用卡可標記本月「已對帳」/「未對帳」(`/api/card-reconciliations`)
   - 底下分別列出該月 income / expense 的簡易預覽,點擊可導向 `/income` 或 `/expense` 查看完整列表
6. **分享項目**:顯示別人分享給我的項目(金額即時來自對方的月度彙總),可勾選是否納入自己的支出/結餘統計(虛擬項目,不會真的存成一筆交易);也可以把自己的項目分享給其他 email

## 深色 / 淺色模式(Dark / Light Mode)

- 提供切換按鈕(建議放在 Navbar)
- 記住使用者偏好(localStorage,或跟隨系統 `prefers-color-scheme`)
- Tailwind 設定 `darkMode: 'class'`

## RWD(響應式設計)

- **不做 PWA**,純粹是網頁響應式設計,確保手機瀏覽器開啟也能正常操作(記帳情境常常會用手機隨手記錄)
- 使用 Tailwind 的響應式 class(`sm: md: lg:`)確保手機/平板/桌面都能正常顯示
- `/overview` 的圖表、row 區塊在手機上應改為單欄堆疊排版

## 專案結構(現況)

```
/app
  layout.tsx
  page.tsx                        // 未登入介紹頁(demo 資料)
  manifest.ts                     // Web App Manifest(非 PWA,只是提供 icon/主題色 metadata)
  /login, /register, /verify-email, /forgot-password  // 各自 page.tsx
  /income, /expense, /overview, /cards, /settings      // 各自 page.tsx
  /admin
    layout.tsx                    // 檢查 ADMIN_EMAIL,非管理員導回 /overview
    page.tsx
    /notification/page.tsx
  /api
    /auth/{register,login,logout,me,verify-email,resend-code,forgot-password,reset-password,change-password,delete-account}/route.ts
    /cards/route.ts, /cards/[id]/route.ts
    /transactions/route.ts, /transactions/[id]/route.ts, /transactions/installment/route.ts
    /subscriptions/route.ts, /subscriptions/[id]/route.ts
    /utilities/route.ts, /utilities/[id]/route.ts
    /custom-items/route.ts, /custom-items/[id]/route.ts
    /card-reconciliations/route.ts
    /overview-summary/route.ts
    /shares/route.ts, /shares/[id]/route.ts, /shares/incoming/route.ts
    /notifications/route.ts, /notifications/mark-read/route.ts
    /admin/notifications/route.ts, /admin/notifications/[id]/route.ts
/lib
  mongodb.ts                      // 資料庫連線
  auth.ts                         // 密碼雜湊、JWT 簽發/驗證、requireAuth()、ADMIN_EMAIL
  calculateBillingPeriod.ts       // 歸屬月份計算邏輯
  calculateMeterCost.ts           // 電費/水費金額計算
  calculateDailyBudget.ts         // 月結算日倒數 + 每日可花預算
  generateSubscriptionTransactions.ts // 訂閱惰性生成交易
  recomputeOverviewSummary.ts     // 重算並覆寫 OverviewSummary 快取
  overviewItems.ts                // 可分享項目 key/label 對照、分享金額貢獻計算
  otp.ts, email.ts                // 驗證碼產生、Resend 寄信
  addMonths.ts, period.ts, usePeriod.ts, demoData.ts
  models/
    User.ts, Card.ts, Transaction.ts, Subscription.ts, Utility.ts,
    CustomItem.ts, CardReconciliation.ts, OverviewSummary.ts, Share.ts, Notification.ts
/components
  Navbar.tsx, ThemeToggle.tsx, MonthPicker.tsx, OverviewChart.tsx, OverviewClient.tsx
  TransactionForm.tsx, TransactionsClient.tsx, ExpenseClient.tsx
  CardForm.tsx, UtilityInlineEditor.tsx, CustomItemsEditor.tsx
  SubscriptionForm.tsx, SubscriptionsClient.tsx
  ShareForm.tsx, SharedItemsSection.tsx
  NotificationBell.tsx, AdminNotificationClient.tsx, AdminLink.tsx
  SpecialDateForm.tsx, ChangePasswordForm.tsx, DeleteAccountForm.tsx
  ForgotPasswordForm.tsx, VerifyEmailForm.tsx
  Modal.tsx, ConfirmDialog.tsx, ToastProvider.tsx, RouteChangeToast.tsx, icons.tsx
proxy.ts                          // 取代 middleware.ts:未登入導回 /login + sliding session
```