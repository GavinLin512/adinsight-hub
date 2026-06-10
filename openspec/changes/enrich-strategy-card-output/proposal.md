## Why

前次變更(enrich-insight-analysis)只強化了餵給 LLM 的輸入,輸出與前端刻意不動 → 前台「AI 月度策略建議」卡片看起來沒變化。使用者希望卡片「多一些東西」:一段整體策略敘述,以及把新算出的效率落差視覺化。本變更把這些確定性數字與 LLM 摘要輸出到前端,讓策略卡片讀起來像一份分析報告。

## What Changes

- 後端 AI 洞察輸出由「逐來源建議陣列」擴為物件:新增 **`summary`**(LLM 綜合三來源的整體策略摘要)與 **`metrics`**(每來源 `efficiency_gap`、`revenue_share`、`budget_share`、`roas_delta_pct`,皆後端確定性算出)。
  - prompt 改要求輸出 `{summary, recommendations}`;`_parse_items` → `_parse_insight` 回傳 `(摘要, 逐條建議)`,相容舊版純陣列。
  - **`metrics` 在所有降級分支都存**(與 LLM 成敗無關)→ 即使 LLM 失敗,效率落差圖仍可顯示。
  - 維持 R13 快照語意:summary / metrics 同樣於 ETL 當下算好、存入 `Insight` 記錄,`GET /insights` 一次帶出,不另開即時 API。
- `GET /insights` 回傳新增 `summary` 與 `metrics`(`InsightOut` 擴充,新增 `InsightMetric`)。
- 前端策略卡片(`AI 月度策略建議 · 近 30 天`)新增兩塊:
  - `InsightCard` 頂部「整體建議」敘述區塊(顯示 `summary`)。
  - 新元件 `EfficiencyGapChart`:效率落差分歧長條(正綠=該加、負紅=該減,以百分點 pp 呈現)。
  - 版面維持「先數據後結論」:ROAS/CPA 圖 → 效率落差圖 → 整體建議 + 逐條建議。

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `ai-insights`: 修改「結構化洞察輸出」需求 —— 輸出除逐來源建議外,新增整體摘要(`summary`)與確定性指標(`metrics`);`metrics` 不依賴 LLM,任何降級分支皆保留。
- `public-dashboard`: 修改「月度策略 ROAS / CPA 對比圖」所屬區塊 —— 策略卡片新增「整體建議」敘述與「預算效率落差」分歧長條圖。

## Impact

- 後端:`insights.py`(prompt、`_parse_insight`、`_build_metrics`、`generate_insights`)、`schemas.py`(`InsightOut` + `InsightMetric`)、`main.py`(`GET /insights` 帶出新欄位)。
- 前端:`types.ts`、`InsightCard.tsx`、新增 `EfficiencyGapChart.tsx`、`PublicDashboard.tsx`。
- 不影響:DB schema(`Insight.content` 為 JSONB,免 migration)、`compute_*` 分析函式、`GET /analytics/*`、營運(近 14 天)區塊。
- 連動:summary / metrics 為 ETL 快照 → 需重跑 ETL 才會出現;舊洞察記錄無這些欄位(前端以可選欄位優雅降級)。
