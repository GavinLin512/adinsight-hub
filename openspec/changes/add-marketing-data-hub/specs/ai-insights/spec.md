## ADDED Requirements

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
系統 SHALL 要求 Gemini 以結構化(JSON)逐條形式輸出,每來源一條建議(來源 + 動作 + 理由),並以繁體中文呈現。

#### Scenario: 結構化逐條建議
- **WHEN** 產生洞察
- **THEN** 回傳每個來源的建議,含來源、預算動作(加/減/維持)、理由
- **AND** 文字為繁體中文

#### Scenario: AI 未照格式回覆的防呆
- **WHEN** Gemini 回傳非預期格式(無法解析為 JSON)
- **THEN** 系統降級為純文字保存/顯示,或回明確錯誤訊息,不得崩潰
- **AND** 記錄錯誤 log

#### Scenario: 缺少 API key 或呼叫失敗
- **WHEN** 未設定 Gemini API key 或 API 呼叫失敗
- **THEN** ETL 其餘流程仍完成,洞察以明確錯誤訊息標記而非 500 崩潰
- **AND** 記錄錯誤 log
