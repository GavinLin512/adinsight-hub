## Why

現有前端是單一頁面、自寫 CSS,且把「執行 ETL、容錯測試、檢視截止日、資料孤島、最後同步狀態」等**維運/開發控制項**和「KPI、圖表、AI 洞察」等**產品內容**混在同一畫面。短時間 demo 看起來像開發中頁面,也不符合真實產品「對外儀表板 vs 內部後台」的分工。

本次將前端改用 **shadcn/ui + Tailwind** 統一視覺(含圖表),並以 **react-router-dom** 分離**前台(對外只讀儀表板)**與**後台(維運控制台)**,讓 demo 更專業、架構更貼近真實。

## What Changes

- 導入 **Tailwind CSS + shadcn/ui**,以 shadcn 元件(Card / Button / Table / Select / Badge / Tabs / Chart 等)重建所有 UI,移除自寫 `styles.css`。
- **圖表改用 shadcn Charts**(`ChartContainer` + `chartConfig`,底層仍為 Recharts),統一主題與 tooltip/legend。
- 改用 **react-router-dom** 做前後台路由:
  - **前台 `/`**:只讀儀表板 — KPI、ROAS、預算分配、每日趨勢、AI 洞察、檢視截止日過濾。
  - **後台 `/admin`**:維運控制台 — 執行 ETL、隨機容錯測試、最後同步狀態、資料孤島(raw vs unified)對比;`/admin/logs` 執行紀錄。
- 共用 Layout 與導覽(前台/後台切換)。後台**不加存取保護**(MVP demo)。
- **後端**:大致沿用既有 API;新增一個 `POST /admin/reset-data`(一鍵清除累積資料,供後台按鈕使用)。

## Capabilities

### New Capabilities
- `frontend-shell`: Tailwind + shadcn 設定、react-router-dom 路由骨架、共用 Layout 與導覽。
- `public-dashboard`: 前台 `/` 只讀儀表板(KPI/圖表/AI 洞察/檢視截止日),全面 shadcn 化。
- `admin-console`: 後台 `/admin` 維運控制台(執行 ETL、容錯測試、最後同步狀態、資料孤島、執行紀錄)。

### Modified Capabilities
<!-- 既有 dashboard-ui / etl-run-history 尚未 archive,故此處以新 capability 描述目標前端架構 -->

## Impact

- 僅前端:`frontend/`(新增 Tailwind/shadcn 設定、`@` 路徑別名、`components.json`、路由與頁面、shadcn 元件);移除 `src/styles.css`、hash 路由。
- 新增前端相依:`react-router-dom`、`tailwindcss`、`shadcn` 生成之元件與其相依(Radix UI、`class-variance-authority`、`clsx`、`tailwind-merge`、`lucide-react`)。
- `vite.config.js` 加 `@` alias;`Dockerfile` 流程不變(仍 `npm install` + dev server)。
- 後端、資料庫、Docker Compose 編排不變。
