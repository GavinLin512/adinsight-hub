## Why

目前 AI 洞察報告(月度策略建議)只拿到「近 30 天單一彙總快照」,看不到時間趨勢,也看不到「預算分配是否對得起營收貢獻」。建議理由因此停留在「ROAS 多少所以加/減」的靜態描述,展現不出真正的分析深度。本變更在**不改輸出格式、不動前端、維持 R13 兩段式快照架構**的前提下,只加強餵給 LLM 的輸入,讓每條建議能引用「前期變化」與「效率落差」這兩個動態訊號。

## What Changes

- 新增洞察專用彙總 `compute_insight_summary(db)`(放 `analytics.py`),計算:
  - **前期比較**:近 30 天 vs 前 30 天,對 `ROAS`(投報率)、`cost_twd`(花費)、`revenue_twd`(營收)、`conversions`(轉換數)四個指標各算 `delta_pct`(百分比變化),由後端確定性算好,LLM 不碰算術。
  - **佔比落差**:每來源加 `revenue_share`(營收佔比)與 `efficiency_gap`(效率落差 = 營收佔比 − 預算佔比;正值代表多賺少花該加、負值代表多花少賺該減)。
- 視窗錨點為最新資料日 `max_date`:近 30 = `[max_date-29, max_date]`、前 30 = `[max_date-59, max_date-30]`。ETL 載入 90 天,前 30 天必有資料。
- 防呆:某來源前 30 天無花費時,`prior=null`、`delta_pct=null`;prompt 註明「新投放、無前期可比、勿杜撰百分比」。
- `generate_insights` 改呼叫 `compute_insight_summary(db)`(取代原 `compute_summary(db, days=30)`);更新 prompt 解釋新欄位,並**強制每條 reason 至少引用一個具體數字**(`delta_pct` 或 `efficiency_gap`),`prior=null` 的來源除外。
- 既有 `compute_summary` 不動(前台儀表板續用);輸出 schema `{source, action, reason}`、`GET /insights` 單筆快取、前端 `InsightCard` 皆不變。

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `marketing-analytics`: 新增「洞察專用彙總(前期比較 + 佔比落差)」需求 —— `compute_insight_summary` 提供近 30/前 30 兩視窗的 KPI、四指標 `delta_pct`、`revenue_share` 與 `efficiency_gap`,並對前期無資料做 null 降級。
- `ai-insights`: 修改「洞察以近 30 天視窗產生」需求 —— 改以 `compute_insight_summary` 作為 prompt 輸入(含前期比較與佔比落差),並要求每條建議理由至少引用一個確定性數字(前期無資料的來源除外)。輸出格式、單筆快取、月度視角不變。

## Impact

- 後端:`backend/app/analytics.py`(新增 `compute_insight_summary` 及其輔助函式)、`backend/app/insights.py`(`generate_insights` 改呼叫新函式、更新 `_PROMPT_TEMPLATE`)。
- 測試:`backend/tests/` 增補前期比較與佔比落差的單元測試(視窗切割、`delta_pct` 計算、`prior=null` 降級、`efficiency_gap` 正負號)。
- 不影響:`compute_summary`、`GET /analytics/*`、`GET /insights` 回傳結構、前端任一元件、DB schema(免 migration)。
