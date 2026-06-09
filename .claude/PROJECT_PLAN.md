# Mini Marketing Data Hub — 專案計畫

> 一個 1.5 天可完成的概念性專案,針對「行銷數據整合 + AI 分析」進行設計。
> 技術棧刻意對齊 JD:**FastAPI + Pandas + PostgreSQL + React + Gemini API**,全套以 **Docker Compose** 編排。

---

## 1. 專案目標

模擬公司的核心業務:把多個廣告平台(Google Ads / Meta / GA4)的異質數據整合進來,清洗成統一結構化資料,計算行銷 KPI,再用 Gemini AI 產出商業洞察,最後以 React Dashboard 可視化。

因為真實的 Google Ads / Meta API 申請與審核遠超 1.5 天,本專案以**模擬資料產生器**取代真實 API。三個來源的資料格式刻意設計成不一致(欄位名、日期格式、幣別不同),以真實呈現「資料孤島」與「清洗」的工程挑戰。

---

## 2. 業務需求對照表

| 業務需求 | 本專案如何處理 |
|---------|----------------|
| 串接多來源 API、解決資料孤島 | 三個格式不一的 mock 來源 → 統一 schema |
| 設計 ETL 流程、資料清洗 | Pandas 清洗:欄位統一、缺值、日期/幣別正規化 |
| 建立結構化資料庫 | PostgreSQL:raw 層 + unified 層分離 |
| High Volume 效能與穩定性 | 批次 upsert、冪等性、錯誤處理、logging |
| AI 產出商業洞察 | Gemini API 把 KPI 數字轉成行銷建議 |
| Dashboard 可視化 | React + Recharts 圖表 + 洞察卡片 |
| 行銷指標(ROAS、預算分配) | 分析層計算 ROAS / CPA / CTR / 預算佔比 |
| Python (FastAPI) + Pandas | 後端核心技術棧 |
| SQL (PostgreSQL) | 資料庫設計與操作 |
| RESTful API | FastAPI 提供 REST 端點 |
| 前端框架觀念 (Vue/React) | React Dashboard |
| GCP AI 服務 | Gemini API(GCP 生態) |

---

## 3. 系統架構

```
  ┌─────────────────────────────────────────────────┐
  │  模擬多來源 (mock generators)                       │
  │  Google Ads 格式 / Meta 格式 / GA4 格式 (刻意不一致)  │
  └───────────────────────┬─────────────────────────┘
                          │ Extract
                          ▼
  ┌─────────────────────────────────────────────────┐
  │  FastAPI 後端                                       │
  │  ┌──────────┐  ┌───────────┐  ┌──────────────┐    │
  │  │ Extract  │→ │ Transform │→ │ Load (upsert) │    │
  │  │          │  │ (Pandas)  │  │              │     │
  │  └──────────┘  └───────────┘  └──────┬───────┘    │
  │         分析層 (ROAS/CPA/CTR/預算佔比)   │            │
  │         AI 洞察層 (Gemini API)          │            │
  └────────────────────────────────────────┼──────────┘
                                           │
                          ┌────────────────▼────────────────┐
                          │  PostgreSQL                       │
                          │  raw_campaigns / unified_campaigns│
                          └────────────────┬─────────────────┘
                                           │ REST API
                          ┌────────────────▼────────────────┐
                          │  React Dashboard (Recharts)     │
                          │  ROAS 長條圖 / 預算圓餅圖 / AI 卡片 │
                          └──────────────────────────────────┘

  全部由 Docker Compose 編排:db / backend / frontend
```

---

## 4. 技術棧

後端:Python 3.11、FastAPI、Pandas、SQLAlchemy、psycopg2
資料庫:PostgreSQL 16
AI:Google Gemini API (gemini-2.5-flash)
前端:React + Vite、Recharts、Axios
編排:Docker Compose(三個 service:db、backend、frontend)

---

## 5. 資料模型

**raw_campaigns**(原始資料,保留各來源原貌)
- id, source(google/meta/ga4), raw_payload(JSONB), ingested_at

**unified_campaigns**(清洗後統一格式)
- id, source, campaign_name, date
- impressions, clicks, cost_twd, conversions, revenue_twd
- 唯一鍵:(source, campaign_name, date) ← 用於冪等 upsert

清洗重點(展現解決資料孤島):
- 欄位名統一(google 用 `campaign`、meta 用 `ad_set_name`、ga4 用 `session_campaign` → 統一為 `campaign_name`)
- 日期格式統一(三來源故意給不同格式)
- 幣別統一成台幣(meta 給 USD → 換算 TWD)

---

## 6. API 端點設計 (RESTful)

| Method | Path | 說明 |
|--------|------|------|
| POST | `/etl/run` | 觸發完整 ETL(extract→transform→load) |
| GET | `/campaigns` | 查詢統一後的資料(支援來源/日期過濾) |
| GET | `/analytics/summary` | 回傳行銷 KPI(ROAS/CPA/CTR/預算佔比) |
| GET | `/insights` | Gemini 產出的商業洞察文字 |
| GET | `/health` | 健康檢查 |

---

## 7. 1.5 天執行計畫

### Day 1 上午 — 基礎建設 + 資料模型
- Docker Compose 骨架(db + backend 先跑起來)
- PostgreSQL schema(raw + unified 兩層)
- 三個 mock 資料產生器(格式刻意不一致)
- ✅ 里程碑:`docker compose up` 後 DB 連得上、mock 資料產得出

### Day 1 下午 — ETL 核心
- FastAPI 專案結構(extract / transform / load 模組分離)
- Pandas 清洗 + 統一 schema
- upsert 進 PG(冪等性)
- logging + 錯誤處理
- ✅ 里程碑:`POST /etl/run` 跑通,重跑不產生髒資料

### Day 1 晚上 / Day 2 上午 — 分析層 + AI 洞察
- 計算 ROAS / CPA / CTR / 預算佔比
- `GET /analytics/summary`
- 串接 Gemini API,`GET /insights` 產出商業建議
- ✅ 里程碑:能拿到一段針對數據的 AI 行銷洞察

### Day 2 下午 — React Dashboard + 收尾
- Vite + React 前端(加進 Docker Compose)
- Recharts:ROAS 長條圖、預算分配圓餅圖
- AI 洞察文字卡片
- README + 架構圖 + 面試講稿重點
- ✅ 里程碑:整套 `docker compose up` 一鍵啟動,Dashboard 顯示完整結果

---

## 8. 專案目錄結構(預計)

```
marketing-data-hub/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py            # FastAPI 進入點
│   │   ├── db.py              # DB 連線 / session
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── etl/
│   │   │   ├── extract.py     # 三個 mock 來源
│   │   │   ├── transform.py   # Pandas 清洗
│   │   │   └── load.py        # upsert
│   │   ├── analytics.py       # KPI 計算
│   │   └── insights.py        # Gemini API
│   └── ...
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    │       ├── RoasChart.jsx
    │       ├── BudgetPie.jsx
    │       └── InsightCard.jsx
    └── ...
```

---

## 9. 專案重點

1. **資料孤島**:「我把三個格式完全不同的廣告來源,透過 raw 層保留原貌、unified 層統一 schema 的兩層設計整合起來。」
2. **冪等性 / 穩定性**:「ETL 用 (source, campaign, date) 唯一鍵做 upsert,重跑不會產生重複資料,對應 High Volume 場景的穩定性需求。」
3. **AI 邏輯化**:「我把計算出的 ROAS、CPA 餵給 Gemini,讓它產出『哪個管道該加減預算』的商業建議,這就是把行銷直覺轉成 AI 邏輯。」
4. **全端 + DevOps**:「整套用 Docker Compose 編排,一個指令啟動 db、backend、frontend 三個服務。」

---

## 10. 開工前準備清單

- [ ] Gemini API key(到 Google AI Studio 免費取得)
- [ ] 本機已安裝 Docker / Docker Compose
- [ ] 確認 port 未被佔用:5432(PG)、8000(FastAPI)、5173(Vite)
