## Context

全新 greenfield 專案,無既有程式碼。目標是 1.5 天完成的概念性 MVP,用來在面試展現「多來源行銷數據整合 + AI 分析」的全棧與資料工程能力。真實廣告平台 API 申請審核時程過長,故以 mock 產生器取代,並刻意讓三來源格式不一致以凸顯資料清洗價值。

## Goals / Non-Goals

**Goals:**
- 三個格式不一致的 mock 來源 → 統一 schema,展現解決資料孤島。
- ETL 具冪等性、logging、錯誤處理,呼應 High Volume 的穩定性需求。
- KPI 計算正確,並由 Gemini 轉成可讀商業洞察。
- 一鍵 `docker compose up` 啟動 db / backend / frontend。

**Non-Goals:**
- 不串接真實 Google Ads / Meta / GA4 API。
- 不做使用者認證、權限、多租戶。
- 不追求生產級效能、CI/CD、自動化測試覆蓋率(MVP 範圍)。
- 不做即時串流;ETL 為手動觸發的批次。

## Decisions

> 以下決策皆於 grill-me 逐題拍板,完整紀錄見 `.claude/rules/decisions.md`(D1–D9 + R1–R6)。

- **D1/D2 Mock 資料策略**:固定歷史 + 每跑新增當天;數值以 `date` 為亂數種子 → 同一天重跑連數值都一致(完全冪等),跨天自然增量。
- **D3 raw 層為 append-only**:`raw_campaigns` 保留每批擷取歷史並標 `ingestion_batch_id`(bronze 層概念);transform 只取最新批次,避免重算。
- **兩層資料模型**:`raw_campaigns`(JSONB 原貌)+ `unified_campaigns`(清洗後)。
- **冪等 upsert**:以 `(source, campaign_name, date)` 唯一鍵 + `ON CONFLICT DO UPDATE`,並採**批次**寫入(D5)。
- **D8 Schema 管理**:以 **Alembic migration** 管理結構,啟動時 `alembic upgrade head`(非 create_all)。
- **D5 資料量**:中等量(數千筆);高流量以批次 upsert/唯一鍵/索引的架構回應。
- **D4/D9 AI 層**:ETL 後呼叫 gemini-2.5-flash 產生**結構化逐條(JSON)、繁體中文**洞察,**快取進 DB**;`GET /insights` 讀 DB。含 JSON 解析失敗防呆。
- **D6 容錯**:mock 來源提供「故意失敗」開關,可現場 demo 單一來源失敗、其餘照常完成。
- **D7 測試**:精選 pytest(清洗、KPI、冪等三重點)。
- **R4 幣別**:Meta USD→TWD 用 `.env` 的固定匯率常數。
- **R1 CORS / R2 啟動順序**:FastAPI 開 CORS;db healthcheck + entrypoint 先 migration 再啟 API + 連線重試。
- **前後端分離**:React(Vite, 5173)透過 Axios 呼叫 FastAPI(8000);Recharts 畫圖。
- **編排**:Docker Compose 三 service。

## Risks / Trade-offs

- **固定匯率(R4)**不反映真實波動 → MVP 取捨,於 README 與面試說明。
- **mock 資料**非真實流量 → 明確標示為概念驗證,重點在架構與資料工程;高流量以設計回答。
- **Gemini 依賴外部服務與 key** → 快取 + 降級訊息 + JSON 防呆,斷網/額度用完仍能 demo。
- **Alembic** 對 MVP 稍重 → 換取 schema 版本控管的面試亮點。
- **測試僅精選** → 聚焦最易錯且最能展示的三點,非全面覆蓋。
