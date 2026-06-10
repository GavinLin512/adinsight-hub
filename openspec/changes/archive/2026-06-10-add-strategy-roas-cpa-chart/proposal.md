## Why

「月度策略建議 · 近 30 天」目前只有 AI 逐條建議文字,缺少對應的數據視覺。補一張各來源近 30 天平均 ROAS / CPA 長條圖,讓使用者一眼看出建議背後的成效對比,且與報告同窗(近 30 天、脫鉤日期鈕)。

## What Changes

- 在「月度策略建議」Card 內新增一張長條圖,呈現各來源近 30 天平均 **ROAS**(左 Y 軸)與 **CPA**(右 Y 軸),每來源兩根分組 bar。
- 明確標示兩軸單位與圖例,並註明「ROAS 越高越好、CPA 越低越好」(方向相反,避免誤讀)。
- 資料沿用 `GET /analytics/summary`,前端以 `getSummary(null, 30)`(無 `end_date`、`days=30`)取得,錨在最新資料日往回 30 天,與洞察報告同窗。**後端不需更動**(端點已支援 `days`)。
- 圖表與報告一致,**完全脫鉤於「檢視截止日」日期鈕**,僅在 mount 載入一次。
- 版面:圖在上、AI 逐條建議列表在下,同屬一張策略 Card。
- CPA 為 null(該來源 `conversions=0`)時該根 bar 不顯示/顯示空,不崩潰。

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `public-dashboard`: 月度策略區塊新增「各來源近 30 天 ROAS / CPA」雙 Y 軸長條圖,與報告同窗且脫鉤日期鈕。

## Impact

- 前端:新增 `frontend/src/components/StrategyKpiChart.tsx`(雙 Y 軸分組長條,shadcn Charts + `sourceChartConfig`);`frontend/src/pages/PublicDashboard.tsx`(在 mount 取 `getSummary(null, 30)` 存策略摘要 state、於策略 Card 內渲染圖表)。
- 後端:無變更(`GET /analytics/summary?days=30` 已可用)。
- 行為:策略圖不隨「檢視截止日」變動;`SourceKpi` 既有 `roas` / `cpa` 欄位即足夠,型別不需變更。
