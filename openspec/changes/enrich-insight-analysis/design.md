## Context

AI 洞察報告(月度策略建議)目前由 `generate_insights` 在 ETL 後呼叫 `compute_summary(db, days=30)`,只取得近 30 天單一彙總快照後丟給 Gemini。建議理由因此只能引用靜態 KPI(「ROAS x 所以加/減」),看不出趨勢與預算效率錯配。R13 已確立兩段式架構:報告是 ETL 當下產生的快照、單次 LLM 呼叫、近 30 天月度視角、不吃前台日期鈕。本變更在此架構下只強化輸入,不改輸出格式與前端。

約束:
- 輸出 schema `{source, action, reason}` 不變、`GET /insights` 單筆快取不變、前端 `InsightCard` 零改動。
- `compute_summary` 同時服務前台儀表板(`GET /analytics/summary`),不可更動其行為。
- 所有 KPI 分母為零須防護(R3);展示用數字必須可靠。

## Goals / Non-Goals

**Goals:**
- 讓每條建議理由能引用「前期變化(`delta_pct`)」與「效率落差(`efficiency_gap`)」兩個動態訊號。
- 展示用數字由後端確定性算好,LLM 不碰算術。
- 前期無資料時優雅降級,不讓 LLM 杜撰百分比。

**Non-Goals:**
- 不改輸出 schema、不動前端、不加 API 參數、不做使用者自選範圍(會破壞 R13 快照)。
- 不改 `compute_summary`、不改 DB schema(免 migration)。
- 不新增 campaign 級下鑽或波動度等其他維度(本次只做前期比較 + 佔比落差)。

## Decisions

### D1. 新開 `compute_insight_summary`,不擴充 `compute_summary`
洞察需要「兩個視窗 + 前期變化 + 佔比落差」,與儀表板的「單視窗 KPI」用途不同。把前期比較邏輯隔離在獨立函式,避免污染 `compute_summary` 的回傳結構(前台正在用)、降低改壞前台風險。
- 替代方案:在 `compute_summary` 加參數回傳前期資料 —— 否決,會擴張共用函式的責任與回傳形狀,牽動 `/analytics/summary`。

### D2. 後端確定性算好 `delta_pct` 與 `efficiency_gap`(LLM 不算術)
展示的核心是理由句裡那串 `+18%`、效率落差數字。LLM 算術不可靠,一旦把 `+17%` 寫成 `+30%`,展示直接翻車。因此後端把減法、百分比都算完,prompt 只要求 LLM「挑選並引用」既有數字。
- 替代方案:餵兩張原始快照讓 LLM 自行計算 —— 否決,算術風險高且正是展示重點。

### D3. 視窗以 `max_date` 為單一錨點
近 30 = `[max_date-29, max_date]`、前 30 = `[max_date-59, max_date-30]`,兩視窗共用同一 `max_date`,與儀表板/趨勢圖的「最新資料日往回 N 天」一致。ETL 載 90 天,前 30 天必有完整資料。
- 實作注意:兩個視窗各自查一次 unified、各自過 `compute_kpis`(重用既有純函式),再以 source 對齊計算 `delta_pct`。

### D4. 前期無資料 → `prior=null` / `delta_pct=null` 降級
某來源前 30 天無花費(整批失敗或新上線)時,`delta_pct` 分母為 0。沿用 R3 精神回 null,並在 prompt 註明該來源為「新投放、無前期可比」,要求 LLM 不要杜撰百分比。
- `delta_pct` 公式:`(近 − 前) / 前 × 100`;前值為 0 或 None → null。

### D5. Prompt 強制每條 reason 引用一個確定性數字
目標是「展現會分析」,故要求每條理由至少帶一個 `delta_pct` 或 `efficiency_gap`;唯 `prior=null` 來源例外(改述新投放)。沿用 D9 防呆:非 JSON / 解析失敗仍降級保留原文,不崩潰。

## Risks / Trade-offs

- [LLM 仍可能複述錯數字或忽略強制規則] → prompt 明確列出已算好的欄位並要求「直接引用、不得重算」;解析層只校驗結構(D9),內容正確性靠 prompt 約束與後端供數。
- [前期視窗與近期視窗在資料不足 30 天時重疊或為空] → 沿用 R3/降級:視窗查無資料時該來源 `prior=null`;unified 全空則回空彙總,不崩潰。
- [token 量略增(多了前期 + 佔比欄位)] → 仍是「每來源數十個數字」等級,單次呼叫,對成本與延遲影響可忽略。
- [新增欄位語意未對齊,LLM 誤解 `efficiency_gap` 正負] → prompt 明寫「正值該加、負值該減」並附中文說明。

## Migration Plan

無 DB migration、無 API 介面變更。部署即重建後端映像(`docker compose up --build backend`)。回滾:還原 `analytics.py` / `insights.py` 兩檔即可,`compute_summary` 與前台未動,不影響既有資料與快取。

## Open Questions

無 —— 視窗、指標、降級、prompt 規則皆已於 grill-me 拍板。
