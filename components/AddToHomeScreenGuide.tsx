const GUIDES: { platform: string; browser: string; steps: string[] }[] = [
  {
    platform: "iPhone / iPad",
    browser: "Safari",
    steps: ["用 Safari 打開這個網站", "點下方工具列的「分享」按鈕(方框加向上箭頭)", "往下滑,選「加入主畫面」", "確認名稱後點右上角「加入」"],
  },
  {
    platform: "Android",
    browser: "Chrome",
    steps: ["用 Chrome 打開這個網站", "點右上角「⋮」選單", "選「加到主畫面」或「安裝應用程式」", "確認後點「安裝」/「新增」"],
  },
];

/** /settings 的「加到主畫面」教學:純說明,不做 PWA/service worker,只是利用 manifest 的 standalone 模式。 */
export default function AddToHomeScreenGuide() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        把網站加到手機主畫面後,就能像 App 一樣從桌面圖示直接打開,全螢幕顯示、沒有網址列,隨手記帳更方便。
      </p>
      <div className="flex flex-col gap-4">
        {GUIDES.map((guide) => (
          <div key={guide.platform}>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {guide.platform}
              <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">({guide.browser})</span>
            </h3>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        iPhone 一定要用 Safari 才能加入主畫面;其他瀏覽器的選單名稱可能略有不同。
      </p>
    </div>
  );
}
