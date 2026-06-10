## 1. 前端:策略摘要資料

- [x] 1.1 `PublicDashboard.tsx` 新增 `strategySummary` state(`AnalyticsSummary | null`)
- [x] 1.2 在 mount(與 `loadInsights` 同階段)以 `getSummary(null, 30)` 取得近 30 天各來源 KPI,存入 state;失敗不阻斷主儀表板
- [x] 1.3 確認 `onDateChange` 不重抓策略摘要(脫鉤日期鈕)

## 2. 前端:圖表元件

- [x] 2.1 新增 `frontend/src/components/StrategyKpiChart.tsx`,props 收 `bySource: SourceKpi[]`
- [x] 2.2 以 shadcn Charts(`ChartContainer` + `sourceChartConfig`)畫雙 Y 軸分組長條:ROAS 左軸、CPA 右軸,每來源兩根 bar
- [x] 2.3 軸標題/圖例標單位(`ROAS (x)`、`CPA (NT$)`)+ 一行說明「ROAS 越高越好、CPA 越低越好」
- [x] 2.4 CPA 為 null(`conversions=0`)的來源濾除其 CPA bar;全部無資料時顯示空狀態文字

## 3. 前端:版面整合

- [x] 3.1 在「月度策略建議 · 近 30 天」Card 內,於 `InsightCard` 之上渲染 `StrategyKpiChart`(圖在上、建議列表在下)
- [x] 3.2 確認策略 Card 仍標「資料截至 {data_date}」,圖與報告同窗

## 4. 驗證

- [x] 4.1 前端 `pnpm run build`(含 `tsc --noEmit`)通過
- [ ] 4.2 手動:策略圖顯示三來源 ROAS/CPA;切換檢視截止日 → 營運圖變、策略圖與報告不動
- [ ] 4.3 手動:模擬某來源 CPA 為 null 時不崩潰、空狀態正常
