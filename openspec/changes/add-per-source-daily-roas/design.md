## Context

既有 `/analytics/timeseries` 只回每日「總和」(跨來源),前台趨勢圖也是總花費/收入;各來源 ROAS 只有 90 天彙總長條圖。要展示「每日哪家最高會洗牌」需要每日 × 各來源的資料與對應折線圖。mock 產生器已加入 `SOURCE_PROFILE` 與每來源每日共用波動因子(`_daily_factor`),資料層已具備此行為,本變更補上端點與前台圖。

## Goals / Non-Goals

**Goals:**
- 後端提供每日 × 各來源彙總端點(含 `end_date` 過濾)。
- 前台多線折線圖呈現各來源每日 ROAS 的交叉/洗牌。
- 將 mock 的「整體 spread + 每日波動 + 冪等」行為納入規格。

**Non-Goals:**
- 不改資料模型、Docker 編排。
- 不改既有 `/analytics/summary`、`/analytics/timeseries` 行為。

## Decisions

- **端點形狀**:`/analytics/timeseries-by-source` 回傳扁平列 `[{date, source, cost_twd, revenue_twd, roas}]`;前端再 pivot 成 `{date, google, meta, ga4}` 餵給折線圖(後端簡單、前端彈性)。
- **ROAS 計算**:每 (date, source) 以 `sum(revenue)/sum(cost)`,cost=0 → null(沿用 R3 防護)。
- **圖表**:shadcn Charts `LineChart`,三條線用 `sourceChartConfig` 色票;預設顯示最近 14 天。
- **檢視截止日**:此圖與既有圖共用前台 `end_date`,切換時一併重抓。
- **資料行為**:`_daily_factor` uniform(0.45,1.85),以 (source,date) 為種子套在當日營收 → 每日擺動、仍冪等(已實作)。

## Risks / Trade-offs

- **線太多/太密**:預設僅顯示最近 14 天,避免 90 天過密。
- **pivot 缺值**:某日某來源無資料時該點為空,折線自動斷點(可接受)。
- **與彙總長條圖訊息重疊**:長條圖看整體 spread、折線圖看每日洗牌,定位互補,於標題/說明區分。
