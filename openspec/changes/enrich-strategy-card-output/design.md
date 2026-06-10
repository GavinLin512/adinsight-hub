## Context

前次變更只強化 LLM 輸入,輸出 schema 與前端刻意不動 → 策略卡片視覺無變化。使用者要求卡片「多一些東西」:整體策略敘述 + 效率落差視覺化。本變更把 `compute_insight_summary` 已算出的確定性數字與 LLM 摘要輸出到前端。需維持 R13(快照、單次 LLM、近 30 天、不吃日期鈕)。

## Goals / Non-Goals

**Goals:**
- 策略卡片新增「整體建議」敘述與「效率落差」圖,讀起來像分析報告。
- 效率落差等數字確定性、與 LLM 成敗脫鉤(失敗時圖仍在)。
- 不另開即時 API、不動 DB schema。

**Non-Goals:**
- 不改營運(近 14 天)區塊、不改 `compute_*` 與 `GET /analytics/*`。
- 不做使用者自選範圍(破壞快照)。

## Decisions

### D1. summary 與 metrics 隨洞察一起快照,不另開即時 API
summary/metrics 都在 ETL 當下算好,存進 `Insight.content`(JSONB),`GET /insights` 一次帶出。符合 R13 快照語意,前端不需多打 API、儀表板載入零額外查詢。
- 替代:另開 `GET /insights/metrics` 即時查 —— 否決,破壞快照、增加查詢與耦合。

### D2. metrics 在所有降級分支都存(與 LLM 脫鉤)
`metrics` 由 `_build_metrics(compute_insight_summary())` 算出,不依賴 LLM。即使缺 key / 呼叫失敗 / 解析失敗,`generate_insights` 仍把 metrics 寫入 `content` → 效率落差圖恆可顯示;只有 `summary` 與逐條建議會缺省。
- 體現「確定性數字 vs 生成式文字」分層:前者保證可用,後者盡力而為(D9)。

### D3. 輸出由陣列改為物件 `{summary, recommendations}`
prompt 改要求物件;`_parse_items` → `_parse_insight` 回傳 `(summary, items)`,並相容舊版純陣列與各種包裝鍵(取第一個 list 值)。`Insight.content` 為 JSONB,免 migration。

### D4. 效率落差以分歧長條 + pp 呈現
`efficiency_gap ∈ [-1,1]` 乘 100 轉百分點(pp);正綠負紅,加 `ReferenceLine x=0`。一眼看出「誰多賺少花(該加)、誰多花少賺(該減)」,直接呼應 action。

### D5. 版面維持「先數據後結論」
順序:ROAS/CPA 圖 → 效率落差圖 → 整體建議 + 逐條建議。沿用既有策略卡片的數據在上、報告在下原則(R13)。

## Risks / Trade-offs

- [舊洞察記錄無 summary/metrics] → 前端欄位皆可選,缺省時不顯示該區塊;重跑 ETL 後出現。
- [LLM 未照 `{summary, recommendations}` 物件格式] → `_parse_insight` 相容純陣列與包裝鍵;summary 取不到則為空字串,不崩潰(D9)。
- [效率落差顏色硬編碼非主題色] → 正負語意需強對比(紅/綠),刻意不走 sourceChartConfig 色票;以圖下文字說明語意。

## Migration Plan

無 DB migration。重建前後端映像(`docker compose up --build`)後重跑 ETL,summary/metrics 方會出現於最新洞察。回滾:還原 `insights.py`/`schemas.py`/`main.py` 與前端四檔即可,舊 `content` 仍可被新舊前端讀取(欄位可選)。

## Open Questions

無。
