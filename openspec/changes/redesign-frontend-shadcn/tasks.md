> 純前端重構,後端不動。決策:react-router-dom、後台不加認證、全面 shadcn 化含圖表。

## 1. 工具鏈設定

- [x] 1.1 安裝 Tailwind CSS + PostCSS + autoprefixer,建立 `tailwind.config.js`、`postcss.config.js`、`src/index.css`(@tailwind 指令)
- [x] 1.2 設定 `@` 路徑別名:`vite.config.js` 的 `resolve.alias` + `jsconfig.json`
- [x] 1.3 `shadcn init`:產生 `components.json`、`src/lib/utils.js`(cn);設定主題色票
- [x] 1.4 安裝 `react-router-dom`
- [x] 1.5 `shadcn add` 需要的元件:button、card、table、select、badge、separator、tabs、chart、sonner

## 2. App Shell 與路由

- [x] 2.1 `main.jsx` 掛載 `RouterProvider`(`createBrowserRouter`)
- [x] 2.2 `Layout`:header + 前台/後台導覽切換 + `<Outlet/>` + Toaster
- [x] 2.3 路由:`/`(前台)、`/admin`(後台)、`/admin/logs`(紀錄);未知路徑導回 `/`

## 3. 圖表改用 shadcn Charts

- [x] 3.1 定義共用 `chartConfig`(各來源色票、鍵名)
- [x] 3.2 `RoasChart` 改 `ChartContainer` + Recharts Bar + `ChartTooltip`
- [x] 3.3 `BudgetPie` 改 shadcn Charts 圓餅
- [x] 3.4 `TrendChart` 改 shadcn Charts 折線(花費/收入)

## 4. 前台只讀儀表板(/)

- [x] 4.1 KPI 卡片(shadcn Card):總花費、ROAS、CPA、CTR
- [x] 4.2 ROAS / 預算 / 趨勢 三張 shadcn 圖表
- [x] 4.3 AI 洞察卡片(逐條建議,shadcn Card + Badge)
- [x] 4.4 檢視截止日(shadcn Select,onChange 即時重抓)
- [x] 4.5 空狀態:無資料時提示前往後台執行 ETL

## 5. 後台維運控制台(/admin)

- [x] 5.1 執行 ETL 按鈕(shadcn Button + sonner 結果提示)
- [x] 5.2 隨機容錯測試按鈕(隨機 1~3 來源失敗)
- [x] 5.3 最後同步狀態卡片(整體狀態 Badge、各來源成敗、洞察狀態、時間)
- [x] 5.4 資料孤島對比(欄位對應 Table + raw/unified 統計)
- [x] 5.5 `/admin/logs` 執行紀錄頁(逐筆 Card/Table)

## 6. 清理與交付

- [x] 6.1 移除 `src/styles.css` 與舊 hash 路由;改用 Tailwind class
- [x] 6.2 確認 `Dockerfile` 仍可 `npm install` + dev server 啟動(新相依)
- [x] 6.3 更新 README:前台/後台路由與 demo 腳本
- [x] 6.4 里程碑(已驗證):`docker compose up --build` 後 `/` 與 `/admin`、`/admin/logs` 皆正常,功能與重構前一致

## 7. TypeScript 化(追加)

- [x] 7.1 加入 TS 相依與 `tsconfig.json`;`components.json` `tsx: true`;`vite.config.ts`
- [x] 7.2 `src/types.ts` 集中 API 回應型別;`api.ts` 以泛型標註回應
- [x] 7.3 所有 `.jsx/.js`(含 ui 元件、圖表、頁面、layout、lib)轉為 `.tsx/.ts` 並補型別
- [x] 7.4 `tsc --noEmit` 通過(strict);`npm run build` 成功

## 8. 一鍵清除資料(追加)

- [x] 8.1 後端 `POST /admin/reset-data`:TRUNCATE raw/unified/insights/etl_runs RESTART IDENTITY
- [x] 8.2 前端 shadcn AlertDialog + 後台「清除所有資料」按鈕(確認後呼叫,完成後重載)
