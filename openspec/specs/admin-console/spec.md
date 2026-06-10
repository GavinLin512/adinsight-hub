# admin-console Specification

## Purpose
TBD - created by archiving change redesign-frontend-shadcn. Update Purpose after archive.
## Requirements
### Requirement: 後台維運控制台
後台 `/admin` SHALL 集中所有維運控制項,以 shadcn 元件呈現。

#### Scenario: 後台內容範圍
- **WHEN** 使用者造訪 `/admin`
- **THEN** 顯示:執行 ETL、隨機容錯測試、最後同步狀態、資料孤島(raw vs unified)對比
- **AND** 提供前往 `/admin/logs` 執行紀錄的入口

### Requirement: 執行 ETL 與隨機容錯測試
後台 SHALL 提供觸發 ETL 的按鈕,以及隨機讓 1~3 個來源失敗的容錯測試按鈕。

#### Scenario: 執行 ETL
- **WHEN** 使用者按「執行 ETL」
- **THEN** 呼叫 `POST /etl/run`,完成後更新最後同步狀態與資料孤島統計

#### Scenario: 隨機容錯測試
- **WHEN** 使用者按「隨機模擬來源失敗並執行 ETL」
- **THEN** 前端隨機挑 1~3 個來源,以 `?fail=` 呼叫,結果顯示各來源成敗

### Requirement: 最後同步狀態與資料孤島對比
後台 SHALL 顯示最後一次執行的同步狀態,以及 raw vs unified 的格式對比與統計。

#### Scenario: 最後同步狀態
- **WHEN** 進入後台
- **THEN** 由 `GET /etl/runs` 取最近一次執行,顯示整體狀態、各來源成敗、洞察狀態、時間

#### Scenario: 資料孤島對比
- **WHEN** 進入後台
- **THEN** 由 `GET /raw/overview` 顯示三來源原始欄位對應統一欄位的對照表
- **AND** 顯示 raw(append-only)與 unified(upsert)統計,呈現重跑時 raw 增長、unified 不變

### Requirement: 一鍵清除所有資料
後台 SHALL 提供「清除所有資料」按鈕,經確認對話框後呼叫後端 `POST /admin/reset-data`,清空 raw / unified / insights / etl_runs(保留 schema 與 mock 產生器)。

#### Scenario: 確認後清除
- **WHEN** 使用者按「清除所有資料」
- **THEN** 顯示確認對話框說明影響與不可復原
- **AND** 確認後呼叫 `POST /admin/reset-data`,完成後重新載入後台狀態(顯示為空)

#### Scenario: 取消不清除
- **WHEN** 使用者在確認對話框按「取消」
- **THEN** 不呼叫後端,資料不變

### Requirement: 執行紀錄頁
`/admin/logs` SHALL 逐筆顯示 ETL 執行紀錄(時間、整體狀態、各來源訊息、洞察狀態)。

#### Scenario: 查看紀錄
- **WHEN** 使用者造訪 `/admin/logs`
- **THEN** 由 `GET /etl/runs` 取得紀錄並逐筆呈現

