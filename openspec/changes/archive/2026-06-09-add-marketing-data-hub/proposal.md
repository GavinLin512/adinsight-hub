## Why

目標公司核心業務是把多個廣告平台(Google Ads / Meta / GA4)的異質數據整合、清洗、計算行銷 KPI,再產出商業洞察。真實 API 申請審核遠超 1.5 天,因此以**模擬資料產生器**取代真實 API,三來源格式刻意設計成不一致(欄位名、日期格式、幣別不同),真實呈現「資料孤島」與「清洗」的工程挑戰。本專案用一個可一鍵啟動的全棧 MVP,展現資料工程、後端、AI 整合與 DevOps 能力,並對齊 JD。

## What Changes

- 從零建立 `adinsight-hub` 全棧專案,以 Docker Compose 編排 db / backend / frontend 三個服務。
- 後端 FastAPI 提供 ETL、查詢、分析、AI 洞察、健康檢查共 5 個 REST 端點。
- PostgreSQL 採 raw 層(保留各來源原貌)+ unified 層(清洗後統一格式)兩層設計。
- 三個格式不一致的 mock 來源(資料以 `date` 為種子確定、固定歷史+每跑新增當天)→ Pandas 清洗 → 批次冪等 upsert 進 unified 層;raw 層 append-only 保留批次歷史。
- 分析層計算 ROAS / CPA / CTR / 預算佔比;AI 層於 ETL 後用 Gemini 產生**結構化逐條**洞察並**快取進 DB**。
- React + Recharts Dashboard 顯示 ROAS 長條圖、預算圓餅圖與逐條 AI 洞察卡片。
- Schema 以 Alembic migration 管理;具來源失敗容錯開關、精選 pytest 測試。

> 詳細設計取捨見 `.claude/rules/decisions.md`(D1–D9 + R1–R6)。

## Capabilities

### New Capabilities
- `etl-pipeline`: 多來源 extract(三個 mock 來源)、Pandas transform 清洗統一、冪等 upsert load;`POST /etl/run`。
- `campaign-data-api`: 資料模型(raw_campaigns / unified_campaigns)與統一資料查詢;`GET /campaigns`(來源/日期過濾)。
- `marketing-analytics`: 行銷 KPI 計算(ROAS / CPA / CTR / 預算佔比);`GET /analytics/summary`。
- `ai-insights`: 串接 Gemini API,把 KPI 數字轉成商業洞察文字;`GET /insights`。
- `dashboard-ui`: React + Vite + Recharts 前端,圖表與 AI 洞察卡片。
- `deployment`: Docker Compose 編排三服務、環境變數、健康檢查 `GET /health`。

### Modified Capabilities
<!-- 全新專案,無既有 capability 變更 -->

## Impact

- 新增整個程式碼庫:`backend/`(FastAPI app、ETL 模組、analytics、insights)、`frontend/`(React)、`docker-compose.yml`、`.env.example`、`README.md`。
- 外部依賴:Google Gemini API key(Google AI Studio 免費取得)、本機 Docker / Docker Compose。
- 佔用 port:5432(PostgreSQL)、8000(FastAPI)、5173(Vite)。
