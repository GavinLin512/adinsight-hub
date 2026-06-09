# AdInsight Hub — Mini Marketing Data Hub

把三個格式刻意不一致的廣告來源(Google Ads / Meta / GA4 mock)整合進統一資料庫,計算行銷 KPI,並用 Gemini 產出商業洞察,最後以 React Dashboard 可視化。全套以 Docker Compose 一鍵啟動。

> 概念性 MVP:以模擬資料產生器取代真實 API。三來源格式(欄位名、日期格式、幣別)刻意不一致,真實呈現「資料孤島」與「清洗」的工程挑戰。

---

## 架構

```
 三個 mock 來源 (格式刻意不一致)
 Google(campaign / YYYY-MM-DD / TWD)
 Meta  (ad_set_name / DD/MM/YYYY / USD)
 GA4   (session_campaign / YYYYMMDD / TWD)
        │  Extract
        ▼
 FastAPI 後端
   Extract ─→ Transform(Pandas 清洗/統一)─→ Load(批次冪等 upsert)
        分析層(ROAS/CPA/CTR/預算佔比)
        AI 洞察層(Gemini,ETL 後產生並快取)
        │
        ▼
 PostgreSQL
   raw_campaigns(append-only + batch_id) / unified_campaigns(唯一鍵) / insights
        │  REST API
        ▼
 React Dashboard(Recharts:ROAS 長條圖 / 預算圓餅圖 / AI 洞察卡片)

 Docker Compose 編排:db / backend / frontend
```

技術棧:Python 3.11、FastAPI、Pandas、SQLAlchemy、Alembic、PostgreSQL 16、Google Gemini (gemini-2.5-flash)、React + Vite + Recharts。

---

## 快速啟動

1. 取得 Gemini API key(https://aistudio.google.com,免費)。
2. 複製環境變數範本並填入 key:
   ```bash
   cp .env.example .env
   # 編輯 .env,填入 GEMINI_API_KEY(留空也能跑,只是洞察會降級)
   ```
3. 一鍵啟動:
   ```bash
   docker compose up --build
   ```
4. 觸發一次 ETL(產生資料 + AI 洞察):
   ```bash
   curl -X POST http://localhost:8000/etl/run
   ```
   或直接在 Dashboard 右上角按「執行 ETL」。
5. 開啟 Dashboard:http://localhost:5173

服務埠:PostgreSQL `5432`、FastAPI `8000`、Vite `5173`。

---

## API 端點

| Method | Path | 說明 |
|--------|------|------|
| POST | `/etl/run` | 觸發完整 ETL;`?fail=meta` 可模擬單一來源失敗 |
| GET | `/campaigns` | 查詢統一資料,支援 `?source=` 與 `?date=` |
| GET | `/analytics/summary` | 整體與分來源 KPI(ROAS/CPA/CTR/預算佔比) |
| GET | `/insights` | 讀取 ETL 後已快取的 AI 洞察 |
| GET | `/health` | 健康檢查 |

---

## 測試

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/ -q
```

涵蓋三個重點:清洗(欄位統一/USD→TWD/日期正規化)、KPI(算式 + 分母為零防護)、冪等性(同批重跑數值不變)。

---

## 設計取捨

- **固定匯率**:Meta USD→TWD 使用 `.env` 的固定匯率常數,不反映真實波動;MVP 取捨。
- **mock 資料**:非真實流量,以模擬產生器取代真實 API 審核;「高流量」以批次 upsert、唯一鍵、索引等架構回應。
- **資料確定性**:mock 數值以 `date` 為亂數種子 → 同一天重跑數值完全一致(完全冪等),跨天自然增量。

完整決策紀錄見 `.claude/rules/decisions.md`(D1–D9 + R1–R6)。

---

## 專案展示重點

1. **資料孤島**:三個格式完全不同的來源,以 raw 層保留原貌、unified 層統一 schema 的兩層設計整合。
2. **冪等性 / 穩定性**:ETL 以 `(source, campaign_name, date)` 唯一鍵批次 upsert,重跑不產生重複資料;raw 層 append-only 保留每批擷取歷史(bronze layer)。
3. **Schema migration**:以 Alembic 版本控管資料表結構,可升級可回滾。
4. **容錯**:`?fail=<source>` 可現場展示單一來源失敗、其餘照常完成。
5. **AI 邏輯化 + 快取**:把 KPI 餵給 Gemini 產出結構化預算建議,並於 ETL 後快取進 DB,Dashboard 秒開、斷網也能 demo。
6. **全端 + DevOps**:Docker Compose 一個指令啟動 db / backend / frontend。
