# etl-pipeline Specification

## Purpose
TBD - created by archiving change add-marketing-data-hub. Update Purpose after archive.
## Requirements
### Requirement: 多來源資料擷取
系統 SHALL 提供三個 mock 資料產生器,分別模擬 Google Ads、Meta、GA4 的原始輸出,且三者欄位名、日期格式、幣別刻意不一致。資料採「固定歷史 + 每跑新增當天」策略,且數值以 `date` 為亂數種子,確保同一天重跑數值完全一致。

#### Scenario: 產生三來源原始資料
- **WHEN** 觸發 extract 階段
- **THEN** 回傳三個來源各自原始格式的資料(Google 用 `campaign`、Meta 用 `ad_set_name` 且幣別為 USD、GA4 用 `session_campaign`)
- **AND** 每筆原始資料連同 `source` 與 `ingestion_batch_id` 寫入 `raw_campaigns`(JSONB payload + ingested_at)

#### Scenario: 數值以日期為種子而確定
- **WHEN** 同一天之內多次觸發 extract
- **THEN** 當天產生的各筆數值(impressions/clicks/cost/conversions/revenue)每次皆相同
- **AND** 跨到不同日期時才產生新一批資料

### Requirement: 來源失敗容錯(可手動觸發)
系統 SHALL 在 mock 來源提供「故意失敗」開關(參數或機率),使單一來源可被手動觸發失敗以展示容錯。

#### Scenario: 單一來源失敗其餘仍完成
- **WHEN** 觸發 ETL 且指定某一來源(如 Meta)失敗
- **THEN** 該來源錯誤被捕捉並寫入 log
- **AND** 其餘兩個來源仍完成 extract→transform→load
- **AND** `POST /etl/run` 回傳含該來源失敗標記的摘要

### Requirement: 資料清洗與統一 schema
系統 SHALL 用 Pandas 將三來源異質資料轉換成統一格式,解決資料孤島。

#### Scenario: 欄位、日期、幣別正規化
- **WHEN** transform 階段處理原始資料
- **THEN** 各來源的活動名稱欄位統一為 `campaign_name`
- **AND** 三種日期格式統一為單一標準格式
- **AND** Meta 的 USD 金額換算為 TWD,所有金額欄位統一為 `cost_twd` / `revenue_twd`

#### Scenario: 缺值處理
- **WHEN** 原始資料含缺值或型別異常
- **THEN** 依欄位規則補值或丟棄,不得讓 pipeline 中斷

### Requirement: 清洗只取最新批次
系統 SHALL 在 transform 階段僅處理 `raw_campaigns` 中最新一批 `ingestion_batch_id` 的資料,不重算歷史批次。

#### Scenario: 只清洗最新批次
- **WHEN** raw 層已累積多批擷取歷史
- **THEN** transform 僅讀取最新 `ingestion_batch_id` 的列進行清洗

### Requirement: 冪等 upsert 載入
系統 SHALL 以 `(source, campaign_name, date)` 為唯一鍵將清洗後資料 upsert 進 `unified_campaigns`,確保重跑不產生重複資料。raw 層則為 append-only,不去重(保留擷取歷史)。

#### Scenario: 重複執行 ETL 不產生髒資料
- **WHEN** 同一天連續執行兩次 `POST /etl/run`
- **THEN** `unified_campaigns` 的資料筆數與第一次執行後相同
- **AND** 既有列被更新而非新增
- **AND** 因數值以日期為種子,既有列的數值亦不變(完全冪等)

#### Scenario: 批次寫入效能
- **WHEN** 載入數千筆清洗後資料
- **THEN** 採批次 upsert(非逐筆)寫入 `unified_campaigns`

### Requirement: ETL 觸發端點
系統 SHALL 提供 `POST /etl/run` 觸發完整 extract → transform → load 流程,並具備 logging 與錯誤處理。

#### Scenario: 成功觸發 ETL
- **WHEN** 呼叫 `POST /etl/run`
- **THEN** 回傳本次處理的筆數摘要(各來源擷取數、載入/更新數)
- **AND** 過程中關鍵步驟寫入 log

#### Scenario: 單一來源失敗時的容錯
- **WHEN** 某一來源在處理過程拋出錯誤
- **THEN** 記錄錯誤 log 並回傳可辨識的錯誤資訊,其餘來源仍應完成處理

### Requirement: 各來源差異化體質與每日波動
mock 產生器 SHALL 讓各來源具不同成效體質(CTR/CVR/CPC/客單價/曝光規模),使**整體**平均 ROAS 與預算分配拉開幅度;並對每來源每天套用一個共用波動因子,使**每日** ROAS 大幅擺動、各來源範圍重疊,讓「每日最高來源」會洗牌。波動因子以 `(source, date)` 為種子,維持冪等。

#### Scenario: 整體有 spread
- **WHEN** 跑完一段期間的 ETL 並計算各來源平均 ROAS
- **THEN** 各來源平均 ROAS 明顯不同(非趨近相等)

#### Scenario: 每日最高來源會洗牌
- **WHEN** 檢視每日各來源 ROAS
- **THEN** 不同日期「最高 ROAS 的來源」並非固定同一家

#### Scenario: 仍維持冪等
- **WHEN** 同一天重跑 ETL
- **THEN** 含波動因子在內的數值完全相同

