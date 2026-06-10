# 前端慣例與 UI 微調紀錄

> adinsight-hub 前端:Vite + React + TypeScript + shadcn/ui + Tailwind,react-router-dom 前後台分離。
> 本檔記錄 UI 慣例與歷次微調,實作時以此為準。

## 架構

- **路由**:`/`(前台只讀儀表板)、`/admin`(後台維運)、`/admin/logs`(執行紀錄);共用 `layouts/Layout.tsx`(header 導覽 + `<Outlet/>` + Toaster)。後台不設認證(MVP)。
- **shadcn 元件**在 `src/components/ui/`;功能元件在 `src/components/`;頁面在 `src/pages/`。
- **圖表**用 shadcn Charts(`ChartContainer` + `chartConfig`,底層 Recharts);各來源色票在 `src/lib/chart-config.ts`(`sourceChartConfig`)。
- **API 型別**集中於 `src/types.ts`;呼叫封裝於 `src/api.ts`(泛型標註)。

## UI 微調(歷次)

- **整體字級**:`src/index.css` 設 `html { font-size: 18px }`(預設 16px),靠 rem 等比放大全站。要調整就改這一處。
- **Tailwind content**:`tailwind.config.js` 的 `content` 必須含 `ts,tsx`(`./src/**/*.{js,ts,jsx,tsx}`)。否則 TS 檔的 class 被 purge → 樣式全失。
- **Toast(sonner)**:
  - 只有一個 Toaster,在 `Layout.tsx`:`<Toaster richColors position="top-right" offset={72} />`。
  - `offset={72}` 把 toast 推到 header(nav,約 56–60px)下方,避免遮擋頂部操作。
  - `ui/sonner.tsx` **不要**覆寫 `toastOptions.classNames.toast` 的底色,否則會蓋掉 `richColors`。
  - 配色靠 `richColors`:`toast.success`→綠、`toast.error`→紅、`toast.warning`→黃。
- **KPI 名詞 tooltip**:前台 KPI(ROAS/CPA/CTR)旁有 `Info` 圖示 + shadcn Tooltip,白話說明;整頁包 `TooltipProvider`。
- **ROAS 兩張圖的分工**:
  - 「各來源每日 ROAS」折線(`SourceRoasTrend`)→ 展示每日洗牌(哪家最高不固定)。
  - 「各來源 ROAS(整體平均)」長條(`RoasChart`)→ 展示整體 spread。
- **日期控制(兩層,易混淆)**:
  - 後台「資料同步日(as-of)」→ 控制 ETL 產生/載入哪天的資料(ingestion 視角)。
  - 前台「報表檢視截止日」(`end_date`)→ 過濾儀表板顯示到某天為止(BI 視角);切換時所有取數一併重抓。
  - **統一 14 天視窗**:全前台(KPI、各來源 ROAS 長條、預算圓餅、兩張趨勢圖)都用同一個視窗 = 「最新資料日(≤ 檢視截止日)往回 14 天」。前端常數 `WINDOW_DAYS=14`(`PublicDashboard.tsx`)為單一來源;`getSummary(endDate, 14)` 帶 `days`,後端 `compute_summary` 以「最新資料日」為錨點往回 N 天,確保與趨勢圖「取最後 14 個資料點」完全對齊。避免長條(原為全部累積)與趨勢(14 天)口徑不一致。
  - 兩個日期控制都用共用 `components/DatePicker.tsx`(shadcn Popover + Calendar,react-day-picker v8;日期字串 `YYYY-MM-DD` ↔ Date 用 `lib/dates.ts` 的 `fmtDate`/`parseDate`,避免 UTC 偏移)。

## 慣例

- 破壞性操作(如後台「清除所有資料」)用 shadcn `AlertDialog` 二次確認,放後台。
- 空狀態以提示文字呈現,不可崩潰(後端尚無資料時引導至後台執行 ETL)。
- 驗證:改完跑 `pnpm run build`(含 `tsc --noEmit`);pnpm 版本由 corepack `packageManager` 鎖定。
