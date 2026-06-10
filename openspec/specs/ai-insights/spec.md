# ai-insights Specification

## Purpose
TBD - created by archiving change add-marketing-data-hub. Update Purpose after archive.
## Requirements
### Requirement: Gemini AI 商業洞察(ETL 後產生並快取)
系統 SHALL 在 ETL 完成、KPI 算好後呼叫 Google Gemini API (gemini-2.5-flash) 產生洞察,並將結果存入資料庫;`GET /insights` 直接讀取已存洞察,不即時呼叫 Gemini。

#### Scenario: ETL 後產生並儲存洞察
- **WHEN** `POST /etl/run` 完成且 KPI 已計算
- **THEN** 系統將 KPI 摘要組成 prompt 呼叫 Gemini
- **AND** 將回傳洞察存入資料庫(供之後讀取)

#### Scenario: 讀取已快取洞察
- **WHEN** 呼叫 `GET /insights`
- **THEN** 直接回傳資料庫中最新一次產生的洞察,不再呼叫 Gemini

### Requirement: 結構化洞察輸出
系統 SHALL 要求模型以結構化(JSON)輸出,包含**整體策略摘要**(`summary`,綜合三來源動能與效率落差的繁體中文敘述)與**逐來源建議**(每來源一條:來源 + 動作 + 理由),全部以繁體中文呈現。系統另 SHALL 在洞察記錄中保存後端確定性算出的 `metrics`(每來源 `efficiency_gap`、`revenue_share`、`budget_share`、`roas_delta_pct`),供前端策略圖表使用;`metrics` 與 LLM 成敗無關,任何降級分支皆須保留。`GET /insights` SHALL 一併回傳 `summary`、`items`、`metrics`,維持 R13 快照語意(於 ETL 當下算好並快取,不另開即時 API)。

#### Scenario: 結構化輸出含整體摘要與逐條建議
- **WHEN** 產生洞察且模型成功回覆
- **THEN** 回傳整體策略摘要(`summary`)與每來源的建議(來源、動作[加/減/維持]、理由)
- **AND** 文字為繁體中文
- **AND** 一併保存 `metrics`(各來源效率落差/前期變化)供前端圖表

#### Scenario: metrics 與 LLM 成敗脫鉤
- **WHEN** LLM 呼叫失敗、缺 API key、或回傳無法解析
- **THEN** 洞察記錄仍保存後端算出的 `metrics`(效率落差等),前端效率落差圖照常可顯示
- **AND** `summary` 與逐條建議則依降級規則缺省,不得崩潰

#### Scenario: AI 未照格式回覆的防呆
- **WHEN** 模型回傳非預期格式(無法解析為 JSON)
- **THEN** 系統降級為純文字保存/顯示,或回明確錯誤訊息,不得崩潰
- **AND** 記錄錯誤 log

#### Scenario: 缺少 API key 或呼叫失敗
- **WHEN** 未設定 API key 或 API 呼叫失敗
- **THEN** ETL 其餘流程仍完成,洞察以明確錯誤訊息標記而非 500 崩潰
- **AND** 記錄錯誤 log

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

