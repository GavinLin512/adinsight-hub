## 1. 後端:洞察輸出擴充

- [x] 1.1 `insights.py` prompt 改輸出物件 `{summary, recommendations}`,summary 須點出整體 ROAS 走勢與預算傾斜方向、至少帶一個數字
- [x] 1.2 `_parse_items` → `_parse_insight` 回傳 `(summary, items)`,相容舊版純陣列與包裝鍵
- [x] 1.3 新增 `_build_metrics(ctx)`:每來源抽 `efficiency_gap`/`revenue_share`/`budget_share`/`roas_delta_pct`
- [x] 1.4 `generate_insights` 存 `content = {summary, items, metrics}`;缺 key/呼叫失敗/解析失敗等降級分支皆保留 `metrics`

## 2. 後端:API 與 schema

- [x] 2.1 `schemas.py` 新增 `InsightMetric`;`InsightOut` 加 `summary`、`metrics`
- [x] 2.2 `main.py` `GET /insights` 從 `content` 帶出 `summary`、`items`、`metrics`

## 3. 前端

- [x] 3.1 `types.ts` 新增 `InsightMetric`;`InsightOut` 加 `summary`、`metrics`
- [x] 3.2 `InsightCard.tsx` 頂部新增「整體建議」敘述區塊(顯示 `summary`)
- [x] 3.3 新增 `EfficiencyGapChart.tsx`:效率落差分歧長條(正綠負紅、pp 單位、ReferenceLine、空狀態)
- [x] 3.4 `PublicDashboard.tsx` 策略卡片插入效率落差圖,維持「ROAS/CPA → 效率落差 → 整體建議+逐條」順序

## 4. 驗證

- [x] 4.1 後端 `py_compile` + `pytest`(含既有 insight summary 測試)全綠
- [x] 4.2 前端 `pnpm run build`(含 `tsc --noEmit`)通過
- [x] 4.3 手動:重跑 ETL 後策略卡片顯示整體建議敘述 + 效率落差圖;LLM 失敗時圖仍在、敘述缺省
- [x] 4.4 更新 `.claude/rules/decisions.md` 追加紀錄(R16)
