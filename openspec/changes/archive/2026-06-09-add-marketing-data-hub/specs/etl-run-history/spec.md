## ADDED Requirements

### Requirement: ETL 執行紀錄持久化
系統 SHALL 將每次 `POST /etl/run` 的摘要(batch_id、整體狀態、各來源成功/失敗與訊息、洞察狀態)存入 `etl_runs`,並提供 `GET /etl/runs` 查詢歷史紀錄。

#### Scenario: 執行後寫入紀錄
- **WHEN** `POST /etl/run` 完成
- **THEN** 依各來源狀態計算整體 status(全成功=ok、部分失敗=partial、全失敗=failed)
- **AND** 將摘要寫入 `etl_runs`

#### Scenario: 查詢歷史紀錄
- **WHEN** 呼叫 `GET /etl/runs`
- **THEN** 回傳最近的執行紀錄(新到舊),含每筆的狀態與各來源訊息

### Requirement: 前端容錯測試與紀錄頁
前端 SHALL 提供容錯測試觸發鈕(隨機讓 1~3 個來源失敗,使用者不指定)與一個獨立紀錄頁,顯示各次執行的成功/失敗訊息。

#### Scenario: 觸發隨機來源失敗
- **WHEN** 使用者在 Dashboard 按「隨機模擬來源失敗並執行 ETL」
- **THEN** 前端隨機挑選 1~3 個來源,以 `?fail=<sources>` 呼叫 `POST /etl/run`
- **AND** 顯示該次各來源成功/失敗狀態(每次結果可能不同)

#### Scenario: 連到紀錄頁查看
- **WHEN** 使用者點擊底部「查看 ETL 執行紀錄」連結(`#/logs`)
- **THEN** 進入紀錄頁,逐筆列出執行時間、整體狀態、各來源訊息與洞察狀態

### Requirement: Demo 用資料截止日
系統 SHALL 支援 `POST /etl/run?as_of=YYYY-MM-DD`,以指定日期作為 mock 資料視窗錨點(預設今天),不破壞冪等;前端提供最近 7 天的下拉選單。

#### Scenario: 指定截止日執行
- **WHEN** 使用者於「Demo:資料截止日」選單選一天並執行
- **THEN** 以 `?as_of=<date>` 呼叫,mock 視窗錨定於該日期
- **AND** 因 upsert 累積,前推日期會帶入新天數,圖表/總額隨之變化

### Requirement: 無資料變更時略過 AI 洞察
系統 SHALL 在本次 `unified_upserted == 0`(如全部來源失敗)時略過 AI 洞察產生,沿用上一份,並回報 `insights_status = "skipped"`。

#### Scenario: 全部失敗時略過洞察
- **WHEN** ETL 後 `unified_upserted` 為 0
- **THEN** 不呼叫 Gemini,`insights_status` 為 `skipped`
- **AND** 既有最新洞察維持不變
