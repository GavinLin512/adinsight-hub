## Context

現有前端為 Vite + React,單頁 + 自寫 `styles.css` + 極簡 hash 路由(`#/logs`),產品內容與維運控制項混在同一畫面。後端 API 已完整(`/analytics/*`、`/insights`、`/etl/*`、`/raw/overview`、`/campaigns`),本次純前端重構,不動後端。

決策前提(已確認):react-router-dom、後台不加認證(MVP)、**全面 shadcn 化含圖表**。

## Goals / Non-Goals

**Goals:**
- 以 shadcn/ui + Tailwind 統一視覺(含圖表用 shadcn Charts)。
- react-router-dom 分離前台(只讀)/後台(維運)。
- 後台集中:執行 ETL、容錯測試、最後同步狀態、資料孤島對比、執行紀錄。
- 前台乾淨對外:KPI、圖表、AI 洞察、檢視截止日。

**Non-Goals:**
- 不做後台認證/權限(MVP,日後再加)。
- 不改後端 API、資料模型、Docker 編排。
- 不導入額外狀態管理(維持 hooks + 既有 `api.js`)。
- 不做 SSR / Next.js(維持 Vite SPA)。

## Decisions

- **語言**:全面採用 **TypeScript**(`.ts/.tsx`),strict 模式;新增 `src/types.ts` 集中 API 回應型別,`api.ts` 以泛型標註 axios 回應;`tsc --noEmit` 納入 build 前置檢查。
- **Tooling**:Tailwind + PostCSS;`shadcn init`(`components.json` `tsx: true`)產生 `@/lib/utils`;`vite.config.ts` 與 `tsconfig.json` 設定 `@ -> src`(單一 tsconfig,含 vite.config,避免 composite 專案參照的 emit 限制)。
- **路由**:`createBrowserRouter`;`/`(前台)、`/admin`(後台)、`/admin/logs`(紀錄)。共用 `Layout`(含 header 導覽切換 + `<Outlet/>`)。
- **圖表**:用 shadcn Charts 的 `ChartContainer` + `chartConfig` + `ChartTooltip/ChartLegend` 包裝 Recharts;RoasChart/BudgetPie/TrendChart 改寫但圖型不變。
- **元件**:`shadcn add` button、card、table、select、badge、separator、tabs、chart、sonner(toast)。
- **資料層**:沿用 `src/api.js`;各頁以 hooks 取數。後台動作(ETL/容錯)完成後重新取數刷新狀態。
- **前後台內容切分**:把 raw-vs-unified、最後同步狀態、容錯測試、執行 ETL 由前台移到 `/admin`;檢視截止日、KPI、圖表、AI 洞察留前台。
- **清理**:移除 `src/styles.css` 與舊 hash 路由邏輯,改 Tailwind class。

## Risks / Trade-offs

- **shadcn 對 Vite 的設定**(alias、Tailwind content path、PostCSS)易踩雷 → 以 shadcn 官方 Vite 指南為準,先驗證一個元件可渲染再全面套用。
- **全面重寫 UI 工時較大** → 先搭骨架(路由 + Layout + 一個 shadcn 頁)再逐頁遷移,降低風險。
- **圖表改 shadcn Charts** 需重設 `chartConfig` 顏色/鍵名 → 圖型與資料來源不變,只換包裝層。
- **相依增加**(Radix、cva 等)→ shadcn 標準相依,可接受。
