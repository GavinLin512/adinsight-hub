## ADDED Requirements

### Requirement: 兩層資料模型
系統 SHALL 以 SQLAlchemy 定義 raw 層與 unified 層兩張資料表。

#### Scenario: raw_campaigns 結構
- **WHEN** 建立資料庫 schema
- **THEN** `raw_campaigns` 含 `id`、`source`、`raw_payload`(JSONB)、`ingestion_batch_id`、`ingested_at`
- **AND** 為 append-only,不設業務唯一鍵

#### Scenario: unified_campaigns 結構與唯一鍵
- **WHEN** 建立資料庫 schema
- **THEN** `unified_campaigns` 含 `id`、`source`、`campaign_name`、`date`、`impressions`、`clicks`、`cost_twd`、`conversions`、`revenue_twd`
- **AND** 對 `(source, campaign_name, date)` 建立唯一約束以支援冪等 upsert
- **AND** 對常用過濾欄位(`source`、`date`)建立索引

### Requirement: Schema 以 Alembic 管理
系統 SHALL 以 Alembic migration 建立與管理資料表結構,而非啟動時自動 create_all。

#### Scenario: 啟動時套用 migration
- **WHEN** backend 容器啟動
- **THEN** 在 API 啟動前執行 `alembic upgrade head` 套用最新 schema
- **AND** migration 在 DB ready 之後才執行

### Requirement: 統一資料查詢端點
系統 SHALL 提供 `GET /campaigns` 查詢 unified 層資料,並支援來源與日期過濾。

#### Scenario: 查詢全部統一資料
- **WHEN** 呼叫 `GET /campaigns` 不帶參數
- **THEN** 回傳 unified_campaigns 全部資料

#### Scenario: 依來源與日期過濾
- **WHEN** 呼叫 `GET /campaigns?source=google&date=YYYY-MM-DD`
- **THEN** 僅回傳符合來源與日期條件的資料

### Requirement: 資料孤島對比總覽
系統 SHALL 提供 `GET /raw/overview` 回傳每來源一筆原始 payload 與 raw/unified 統計,供前端展示「三來源不一致格式 → 統一」與兩層設計差異。

#### Scenario: 取得對比總覽
- **WHEN** 呼叫 `GET /raw/overview`
- **THEN** 回傳每來源(google/meta/ga4)最新一筆原始 payload
- **AND** 回傳 raw 統計(總筆數、批次數、各來源筆數)與 unified 統計(總筆數、日期範圍)

#### Scenario: append-only 與冪等的可視差異
- **WHEN** 重複執行 ETL 後再呼叫 `GET /raw/overview`
- **THEN** raw 總筆數與批次數增加,unified 總筆數不變
