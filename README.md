# AdInsight Hub — Mini Marketing Data Hub

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?logo=pandas&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?logo=sqlalchemy&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

[![Frontend: Cloudflare](https://img.shields.io/badge/Frontend-Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://adinsight-hub.pages.dev)
[![Backend: Render](https://img.shields.io/badge/Backend-Render-000000?logo=render&logoColor=white)](https://adinsight-hub.onrender.com/docs)
![Database: Neon](https://img.shields.io/badge/Database-Neon-00E599?logo=postgresql&logoColor=white)

**線上 Demo:** https://adinsight-hub.pages.dev — 後端為 Render 免費層,閒置後首次載入約需 30–50 秒喚醒,請稍候。

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
        AI 洞察層(Gemini,失敗時 NVIDIA NIM 後備;ETL 後產生並快取)
        │
        ▼
 PostgreSQL
   raw_campaigns(append-only + batch_id) / unified_campaigns(唯一鍵) / insights
        │  REST API
        ▼
 React Dashboard(Recharts:ROAS 長條圖 / 預算圓餅圖 / AI 洞察卡片)

 Docker Compose 編排:db / backend / frontend
```

技術棧:Python 3.11、FastAPI、Pandas、SQLAlchemy、Alembic、PostgreSQL 18(psycopg 3)、Google Gemini (gemini-2.5-flash) + NVIDIA NIM 後備、React + Vite + Recharts(shadcn/ui Charts)。

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
4. 觸發一次 ETL(產生資料 + AI 洞察):於**後台**(下方)按「執行 ETL」,或:
   ```bash
   curl -X POST http://localhost:8000/etl/run
   ```
5. 開啟前端:http://localhost:5173

服務埠:PostgreSQL `5432`、FastAPI `8000`、Vite `5173`。

### 前端路由(shadcn/ui + react-router-dom)

| 路由 | 說明 |
|------|------|
| `/` | **前台**:對外只讀儀表板 — KPI、ROAS、預算分配、每日趨勢、AI 洞察、檢視截止日 |
| `/admin` | **後台**:維運控制台 — 執行 ETL、隨機容錯測試、最後同步狀態、資料孤島(raw vs unified)對比 |
| `/admin/logs` | ETL 執行紀錄(各次成功/失敗訊息) |

> 後台 MVP 不設存取保護。

---

## 部署

雲端採三方託管,各取其免費層與託管優勢:

| 層 | 平台 | 網址 | 說明 |
|------|------|------|------|
| ![Cloudflare](https://img.shields.io/badge/-Cloudflare-F38020?logo=cloudflare&logoColor=white) 前端 | Cloudflare Pages | [adinsight-hub.pages.dev](https://adinsight-hub.pages.dev) | Vite 靜態產物 + 全球 CDN |
| ![Render](https://img.shields.io/badge/-Render-000000?logo=render&logoColor=white) 後端 | Render | [adinsight-hub.onrender.com](https://adinsight-hub.onrender.com/docs) | FastAPI 容器;啟動時自動 `alembic upgrade head`,連接埠由 `$PORT` 動態指定。**免費層 scale-to-zero,閒置後首次請求約需 30–50 秒冷啟動** |
| ![Neon](https://img.shields.io/badge/-Neon-00E599?logo=postgresql&logoColor=white) 資料庫 | Neon | — | Serverless PostgreSQL 18,scale-to-zero |

> 本機開發仍以 `docker compose up --build` 一鍵啟動(db / backend / frontend);雲端則三方分離部署。

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
- **工具鏈鎖定**:前端以 corepack 的 `packageManager` 欄位鎖定精確 pnpm 版本,確保各環境與 CI 可重現;依賴升級走 Renovate 自動開 PR + CI 把關,而非執行期浮動。

完整決策紀錄見 `.claude/rules/decisions.md`(D1–D9 + R1–R16)。

---

## 專案展示重點

1. **資料孤島整合**:三個格式完全不同的來源(欄位名 / 日期格式 / 幣別皆異),以 raw 層保留原貌、unified 層統一 schema 的兩層(bronze→silver)設計整合;前台有 raw vs unified 對比面板把「整合」這件事視覺化。
2. **冪等性 / 增量同步**:ETL 以 `(source, campaign_name, date)` 唯一鍵批次 upsert,重跑不產生重複;raw 層 append-only 保留每批擷取歷史(`batch_id`),transform 只取最新批次 → 最接近真實的 incremental sync。
3. **Schema migration**:以 Alembic 版本控管資料表結構,可升級可回滾;後端啟動先 `alembic upgrade head` 再起 API。
4. **容錯 + 可觀測性**:可隨機讓 1~3 個來源失敗,其餘照常完成;每次執行摘要持久化到 `etl_runs` 表,`#/logs` 頁逐筆呈現各來源成敗,Dashboard 頂部顯示「最後同步狀態」。
5. **AI 韌性(三層降級)**:Gemini 為主、對暫時性錯誤(429/503)指數退避重試;耗盡後切 NVIDIA NIM 後備;再不行則 JSON 解析失敗降級為純文字 / 明確錯誤 — 全程不崩潰。
6. **確定性數字 vs 生成式文字分層**:效率落差、各來源佔比等指標由後端**確定性計算**並快取,與 LLM 脫鉤 → 即使 AI 全降級,效率落差圖仍可顯示;只有敘述文字會缺省。體現「數據保證可用、生成盡力而為」。
7. **BI 設計:兩段式時間鏡頭**:即時營運概覽(近 14 天,隨檢視截止日變動)與月度策略建議(近 30 天,脫鉤)刻意分開,呼應「短線洗牌 vs 月度預算分配」本就不同尺度;洞察輸入再加「近 30 vs 前 30」對比與效率落差,讓建議理由引用真實變化而非靜態描述。
8. **AI 快取**:洞察於 ETL 後一次算好存 DB,`GET /insights` 直接讀 → Dashboard 秒開、省 API 額度、斷網也能 demo。
9. **全端 + DevOps**:本機 `docker compose up --build` 一鍵起 db / backend / frontend;雲端三方分離部署 — 前端 Cloudflare Pages、後端 Render(自動跑 migration)、資料庫 Neon serverless PostgreSQL。
10. **正確性測試**:pytest 精選關鍵測試 — 清洗、KPI(含分母為零)、冪等性、洞察前後期視窗計算,堵住「你怎麼確保正確性」。
