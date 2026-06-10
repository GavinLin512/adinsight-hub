## 1. 資料行為(mock)

- [x] 1.1 `SOURCE_PROFILE` 各來源差異化體質(整體 ROAS/預算 spread)
- [x] 1.2 `_daily_factor`(每來源每天共用波動,seeded by (source,date))套在當日營收 → 每日洗牌、仍冪等
- [x] 1.3 既有 pytest 仍通過(冪等性測試確認決定性)

## 2. 後端端點

- [x] 2.1 `analytics.compute_timeseries_by_source(db, end_date)`:group by (date, source),算 cost/revenue/roas(cost=0→null)
- [x] 2.2 `schemas.py` 新增 `SourceTimeseriesPoint`
- [x] 2.3 `GET /analytics/timeseries-by-source`(支援 `end_date`)

## 3. 前端圖表

- [x] 3.1 `api.ts` 新增 `getTimeseriesBySource(endDate?)`;`types.ts` 補型別
- [x] 3.2 `SourceRoasTrend` 元件:pivot 成 {date, google, meta, ga4},shadcn `LineChart` 三條線(最近 14 天)
- [x] 3.3 `PublicDashboard` 加入該圖,並隨檢視截止日重抓;空狀態處理

## 4. 收尾

- [x] 4.1 `tsc --noEmit` 與 `pnpm run build` 通過;後端 py_compile 通過
- [x] 4.2 里程碑(已驗證):前台可見三來源每日 ROAS 折線交叉,切換截止日會更新
