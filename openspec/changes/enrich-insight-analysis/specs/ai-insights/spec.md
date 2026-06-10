## MODIFIED Requirements

### Requirement: 洞察以近 30 天視窗產生(月度策略)
系統 SHALL 在產生 AI 洞察時,以洞察專用彙總 `compute_insight_summary(db)` 作為 prompt 輸入。該彙總除近 30 天 KPI 外,另含**前期比較**(近 30 天 vs 前 30 天,對 `roas`、`cost_twd`、`revenue_twd`、`conversions` 的 `delta_pct`)與**佔比落差**(`revenue_share`、`efficiency_gap`),且全部數字由後端確定性算好,LLM 不得自行重算。prompt SHALL 註明資料期間為「近 30 天」並解釋上述欄位語意,使建議定位為月度策略。系統 SHALL 要求每條建議理由至少引用一個確定性數字(`delta_pct` 或 `efficiency_gap`),唯該來源前期無資料(`prior=null`)時改述為「新投放、無前期可比」且不得杜撰百分比。ETL 載入範圍(90 天)、`GET /insights` 單筆快取(無 window 參數)與輸出格式(每來源一條 `{source, action, reason}`)維持不變(D4/D9/R13)。

#### Scenario: 以增強彙總產生洞察
- **WHEN** `POST /etl/run` 完成且 KPI 已計算
- **THEN** 系統以 `compute_insight_summary(db)` 組成 prompt
- **AND** prompt 註明資料期間為「近 30 天」並含前期比較(`delta_pct`)與佔比落差(`efficiency_gap`)
- **AND** 將回傳洞察存入資料庫供 `GET /insights` 讀取

#### Scenario: 每條建議引用確定性數字
- **WHEN** 某來源有前期可比資料
- **THEN** 該來源的 `reason` 至少引用一個確定性數字(`delta_pct` 的百分比變化或 `efficiency_gap` 的效率落差)
- **AND** 數字直接取自彙總已算好的值,不由 LLM 重算

#### Scenario: 前期無資料的來源
- **WHEN** 某來源 `prior=null`(前 30 天無資料)
- **THEN** 該來源的 `reason` 改述為「新投放、無前期可比」
- **AND** 不得杜撰前期百分比變化

#### Scenario: 資料不足 30 天
- **WHEN** unified 層現有資料不足 30 天
- **THEN** 以現有可取得的天數彙總,不得拋錯或崩潰

#### Scenario: 維持單筆快取讀取
- **WHEN** 呼叫 `GET /insights`
- **THEN** 直接回傳最新一次產生的洞察,不接受也不需要視窗參數
