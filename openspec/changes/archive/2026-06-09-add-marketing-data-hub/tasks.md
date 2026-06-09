> 設計決策依據:`.claude/rules/decisions.md`(D1–D9 + R1–R6)。

## 1. 基礎建設與資料模型(Day 1 上午)

- [x] 1.1 建立專案骨架:`backend/`、`frontend/`、`docker-compose.yml`、`.env.example`、`README.md`、`.gitignore`(排除 `.env`)(R5)
- [x] 1.2 Docker Compose:`db`(PostgreSQL 16)加 healthcheck;`backend` 等 db ready 後啟動(R2)
- [x] 1.3 後端 `db.py`:SQLAlchemy 連線/session,從環境變數讀連線字串,連線加重試(R2)
- [x] 1.4 `models.py`:`raw_campaigns`(JSONB + `ingestion_batch_id`,append-only)、`unified_campaigns`(唯一鍵 `(source, campaign_name, date)` + `source`/`date` 索引)(D3)
- [x] 1.5 導入 Alembic:`alembic.ini` + `env.py` + 初始 migration;entrypoint 先 `alembic upgrade head` 再啟 FastAPI(D8/R2)
- [x] 1.6 三個 mock 產生器(Google/Meta/GA4)格式刻意不一致;固定歷史 + 每跑新增當天;數值以 `date` 為種子;附「故意失敗」開關(D1/D2/D6)
- [x] 1.7 里程碑(已驗證):`docker compose up` 後 migration 成功、DB 連得上、mock 資料產得出

## 2. ETL 核心(Day 1 下午)

- [x] 2.1 `etl/extract.py`:呼叫三 mock 來源,整批寫入 `raw_campaigns`(payload + source + `ingestion_batch_id` + ingested_at)
- [x] 2.2 `etl/transform.py`:只取最新 `ingestion_batch_id`;Pandas 統一欄位名、日期格式(純 date,R6)、幣別(USD→TWD,匯率來自 `.env`,R4)、缺值處理(D3)
- [x] 2.3 `etl/load.py`:批次 `ON CONFLICT DO UPDATE` 冪等 upsert 進 `unified_campaigns`(D5)
- [x] 2.4 `POST /etl/run`:串接 extract→transform→load,回傳各來源筆數摘要(含失敗來源標記)
- [x] 2.5 logging + 單一來源失敗容錯(其餘來源仍完成)(D6)
- [x] 2.6 里程碑(已驗證):`POST /etl/run` 跑通;同一天連跑兩次驗證完全冪等(筆數與數值皆不變);手動觸發某來源失敗、其餘照常

## 3. 查詢 API 與資料驗證

- [x] 3.1 `schemas.py`:Pydantic 回應模型
- [x] 3.2 `GET /campaigns`:查詢 unified 資料,支援 `source` 與 `date` 過濾
- [x] 3.3 里程碑(已驗證):驗證 raw 層(多批歷史)與 unified 層(最新且去重)資料一致性

## 4. 分析層與 AI 洞察(Day 1 晚 / Day 2 上午)

- [x] 4.1 `analytics.py`:計算 ROAS / CPA / CTR / 預算佔比;所有分母為 0 防護(含 ROAS cost=0、預算總和=0)(R3)
- [x] 4.2 `GET /analytics/summary`:回傳整體與分來源 KPI
- [x] 4.3 `insights.py`:ETL 後將 KPI 組 prompt 呼叫 gemini-2.5-flash,要求**結構化 JSON 逐條、繁體中文**;結果存進 DB(D4/D9)
- [x] 4.4 JSON 解析失敗防呆 + 缺 key/呼叫失敗降級(不崩潰、ETL 其餘照常)(D9)
- [x] 4.5 `GET /insights`:直接讀 DB 已快取洞察(不即時打 Gemini)(D4)
- [x] 4.6 里程碑(已驗證):ETL 後能讀到一段結構化中文 AI 洞察;斷網仍能由 DB 顯示

## 5. React Dashboard(Day 2 下午)

- [x] 5.1 Vite + React 專案,加入 Docker Compose(`frontend` service, port 5173)
- [x] 5.2 後端啟用 CORS 允許前端來源(R1);`api.js` 用 Axios 封裝 API 呼叫
- [x] 5.3 `RoasChart.jsx`:Recharts ROAS 長條圖
- [x] 5.4 `BudgetPie.jsx`:預算分配圓餅圖
- [x] 5.5 `InsightCard.jsx`:逐條 AI 洞察卡片(來源 + 動作 + 理由)(D9)
- [x] 5.6 空狀態處理(後端尚無資料時不崩潰)

## 6. 測試(精選)(D7)

- [x] 6.1 transform 測試:欄位統一、USD→TWD、日期正規化(已執行 13 passed)
- [x] 6.2 analytics 測試:ROAS/CPA/CTR 算對,且各分母為 0 不崩(R3)
- [x] 6.3 冪等性測試:同批資料跑兩次,筆數與數值皆不變

## 7. 部署收尾與交付

- [x] 7.1 `GET /health` 健康檢查端點
- [x] 7.2 `.env.example` 補齊(DB、Gemini key、`USD_TWD_RATE`);確認密鑰不寫死、不進 git(R4/R5)
- [x] 7.3 README:架構圖、啟動步驟、設計取捨(固定匯率/mock 等)、面試講稿重點(資料孤島 / 冪等性 / Alembic migration / AI 快取 / 容錯 / 全棧 DevOps)
- [x] 7.4 最終里程碑(已驗證):整套 `docker compose up` 一鍵啟動,Dashboard 顯示完整結果

## 8. ETL 執行紀錄與前端容錯測試(追加)

- [x] 8.1 `etl_runs` model + Alembic migration 0002
- [x] 8.2 `POST /etl/run` 後計算整體 status 並寫入 `etl_runs`;新增 `GET /etl/runs`
- [x] 8.3 前端 `api.js`:`runEtl(failSources)` 帶 `?fail=`、`getEtlRuns()`
- [x] 8.4 Dashboard 容錯測試區:選來源 → 模擬失敗並執行,顯示各來源成功/失敗
- [x] 8.5 hash 路由 + 紀錄頁(`#/logs`):逐筆顯示時間、狀態、各來源訊息、洞察狀態
- [x] 8.6 里程碑(已驗證):按鈕觸發失敗 → 紀錄頁顯示對應成功/失敗訊息

## 9. 面試展示強化(追加)

- [x] 9.1 每日趨勢圖 `GET /analytics/timeseries` + 前端 TrendChart(最近 14 天)
- [x] 9.2 檢視截止日 view filter:`/analytics/summary`、`/timeseries` 加 `end_date`;前端下拉即時重抓
- [x] 9.3 raw vs unified 對比:`GET /raw/overview` + 前端 RawUnifiedPanel(欄位對應表 + raw/unified 統計列)
- [x] 9.4 按鈕/下拉樣式統一(primary/secondary/danger、select)
- [x] 9.5 里程碑(已驗證):面板顯示三來源格式差異;重跑後 raw 漲、unified 不漲
