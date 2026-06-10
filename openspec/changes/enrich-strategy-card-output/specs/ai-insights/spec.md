## MODIFIED Requirements

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
