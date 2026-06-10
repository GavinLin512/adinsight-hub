# 設計決策紀錄(grill-me 逐題確認)

> 本檔記錄 `add-marketing-data-hub` 在 grill-me 過程中,逐一拍板的設計決策。
> 每問完一題即在此追加。實作時以本檔為準。

## D1. Mock 資料產生策略
**決定:固定歷史 + 每跑新增當天**
- 歷史資料固定不變;每次跑 ETL 只 append「當天」這一批新資料。
- 對歷史而言完全冪等,最接近真實增量同步(incremental sync)的 ETL。

## D2. 當天資料的數值決定方式
**決定:用 `date` 當亂數種子,數值完全固定**
- 同一天之內重跑,連數值都一樣 → 完全冪等,Dashboard 不會抖動。
- 跨天才會有新資料,自然形成增量。
- 唯一鍵 `(source, campaign_name, date)` 保證同一天重跑走 update、不新增。

## D3. raw 層(raw_campaigns)的本質
**決定:做法 A — append-only 審計日誌 + batch_id**
- raw 保留每次擷取的原始歷史(bronze layer 概念),不去重。
- 每批擷取標上 `ingestion_batch_id` / `run_id`。
- **連動規則**:transform 清洗時只取「最新一批 batch_id」的資料,不重算所有歷史批次。

## D4. Gemini AI 洞察的產生時機與儲存
**決定:做法乙 — ETL 跑完先算好、存進資料庫(快取)**
- ETL 完成、KPI 算好後,順手呼叫一次 Gemini,把洞察文字存進 DB。
- `GET /insights` 直接讀 DB,不再即時打 Gemini。
- 好處:Dashboard 秒開、省 API 額度、斷網也能 demo、文字穩定。
- 資料更新(重跑 ETL)時才重新產生洞察。

## D5. 資料量規模 vs JD「高流量」
**決定:方向二 — 中等量(數千筆)+ 用設計回應高流量**
- 產生數千筆,讓圖表夠好看即可,不灌到十萬筆。
- 「高流量」以架構回答:批次 upsert、唯一鍵、索引、可水平擴展。

## D6. 容錯能力的展示方式
**決定:做法甲 — 做一個「故意壞」開關**
- mock 來源加參數/機率,可手動讓某一來源(如 Meta)失敗。
- ETL 捕捉該錯誤、記 log,其餘來源照常完成 → 容錯能力可現場 demo。
- 對應 spec:「單一來源失敗時,其餘來源仍應完成處理」。

## D7. 測試策略
**決定:方向一 — 精選關鍵測試(pytest,約 5~8 個)**
- 只測三個重點:
  1. 清洗(transform):欄位統一、USD→TWD、日期正規化。
  2. KPI:ROAS/CPA/CTR 算對,且分母為 0 不崩。
  3. 冪等性:同批資料跑兩次,筆數不變。
- 目的:堵住面試必考題「你怎麼確保正確性」。

## D8. 資料表建立方式
**決定:做法乙 — Alembic migration(已從 create_all 改為此)**
- 用 Alembic 管理 schema:結構以遷移檔版本控管、可升級可回滾。
- 後端不自動建表;啟動流程先跑 `alembic upgrade head` 再啟動 FastAPI(寫進 entrypoint)。
- 新增 `alembic/`(env.py + versions/ 遷移檔)與 `alembic.ini`。
- **連動規則**:docker 啟動需確保 migration 在 DB ready 之後、API 啟動之前執行(配合 R2 的 healthcheck/重試)。
- 面試亮點:懂 migration、schema 版本控管。

## D9. Gemini 洞察的輸出格式
**決定:做法乙 — 結構化逐條(JSON)**
- 要求 Gemini 回固定結構:每來源一條建議(來源 + 動作[加/減/維持預算] + 理由)。
- 統一以**繁體中文**輸出。
- **連動規則(防呆)**:AI 偶爾不照格式回 → 需做 JSON 解析失敗的容錯(降級為純文字顯示或回明確錯誤,不可崩潰)。
- 前端洞察卡片以「逐條建議列表」呈現。

---

# 收尾待辦(R 系列,非抉擇,照預設實作)

## R1. CORS
FastAPI 開啟 CORS,允許前端來源(http://localhost:5173)。否則瀏覽器擋跨來源請求,Dashboard 抓不到資料。

## R2. 開機順序 / DB readiness
docker compose 對 db 加 healthcheck;backend entrypoint 在連線/migration 前加重試,避免 DB 未就緒就啟動而崩潰。

## R3. 除以零(全面)
所有 KPI 分母為 0 都要防護:CTR(impressions=0)、CPA(conversions=0)、ROAS(cost=0)、預算佔比(總 cost=0)→ 回 null/0,不可拋錯。

## R4. 匯率寫死
Meta USD→TWD 使用固定匯率常數,放 `.env` 可調(如 `USD_TWD_RATE`)。README 誠實註明此為 MVP 取捨。

## R5. 密鑰管理
Gemini API key、DB 密碼一律走 `.env`;提供 `.env.example` 範本;`.gitignore` 排除 `.env`,密鑰不得寫死或進 git。

## R6. 時區 / 日期
unified 層只存純 `date`(不含時間),清洗時把三來源不同日期格式統一為單一標準日期,避免時區混亂。

## R7. Gemini 暫時性錯誤自動重試(實作後追加)
`insights._call_gemini` 對暫時性錯誤(503/UNAVAILABLE、429/RESOURCE_EXHAUSTED、overloaded)以指數退避(2s/4s/8s)重試 3 次;其餘錯誤立即拋出並走 D9 降級。減少高流量時需手動重跑,呼應穩定性訴求。

## R8. ETL 執行紀錄 + 隨機容錯測試(追加功能)
- 新增 `etl_runs` 表(migration 0002)持久化每次執行摘要;`GET /etl/runs` 查詢。
- 前端「容錯測試」按鈕**隨機**讓 1~3 個來源失敗(使用者不指定),結果由回應誠實回報。
- hash 路由 `#/logs` 紀錄頁逐筆顯示時間、整體狀態、各來源成功/失敗訊息、洞察狀態。
- 對應 capability `etl-run-history`。

## R9. 來源失敗時的圖表與洞察語意(澄清 + 微調)
**現象是正確的**:來源失敗時圖表仍顯示該來源、AI 報告仍出現。原因:
- `unified_campaigns` 為 upsert 不刪資料(D3),失敗只代表「本次同步未更新該來源」,歷史資料保留 → 圖表(讀累積資料)仍有它。這是真實 ETL 的韌性。
**兩項微調**:
1. **無資料變更則略過 AI 洞察**:當 `unified_upserted == 0`(如全部失敗)→ `insights_status="skipped"`,沿用上一份洞察、省 Gemini 呼叫。資料沒變,洞察就不該變。
2. **Dashboard「最後同步狀態」面板**:圖表上方顯示本次各來源成敗 + 洞察狀態 + 時間,並在非全成功時註明「圖表為累積資料,失敗來源沿用歷史」。狀態由後端 `etl_runs` 載入,重整也在。

## R10. 日期展示:檢視截止日(view filter)+ 每日趨勢圖
**背景**:同一天重跑數值不變(D2 冪等);且 ROAS 長條圖、預算圓餅圖都是**比例**,加入更多相似日子比例幾乎不動 → 圖表看起來不變,demo 不直觀。
**為何不用 ETL as_of 做展示**:upsert 累積,一旦載入今天資料後,後續再選日期也不會移除 → 無法穩定展示「逐步增加」。
**最終作法(兩部分)**:
1. **每日趨勢線圖**(`GET /analytics/timeseries`,前端 TrendChart 顯示最近 14 天每日花費/收入)— date 維度,日期不同數值不同,是日期變化看得見的地方。
2. **檢視截止日 view filter**:`GET /analytics/summary` 與 `timeseries` 新增 `end_date`,只回該日(含)以前資料;前端「檢視截止日」最近 7 天下拉選單,**onChange 即時重抓**。往今天前推 → 總花費與趨勢逐步增加(純查詢過濾,與已載入/upsert 狀態無關,穩定可重現)。
- 比例型圖表(ROAS/預算佔比)本就穩定,UI 加註說明屬正常。
- `POST /etl/run?as_of=` 仍保留(後端,API/docs 可用),但前端展示改用 view filter。

**更新(R13 連動):預設與上限對齊最新資料日(不再用「今天」)**
- 原本前端「檢視截止日」預設今天、上限今天;但 ETL as-of 可能落後於今天(例:資料只到 6/1,牆鐘 6/10)→ 截止日顯示 6/10 但其後無資料,易誤會。
- 改為:**預設值與上限皆對齊「最新資料日」**(`max(unified.date)`),隨每次 ETL 自動更動。使用者只能往回看歷史,不會選到沒資料的日子。
- 來源:`GET /insights` 回傳 `data_date = max(unified.date)`(免 migration;與洞察 30 天視窗的錨點同一值);前端 `PublicDashboard` 載入洞察後將 `viewDate` 與 DatePicker `max` 對齊 `data_date`。因營運視窗本就錨在「≤ 截止日的最新資料日」,對齊後與用今天取數結果相同,**無需重抓**。
- 同一 `data_date` 也用於洞察卡片副標「資料截至 {data_date}」,與截止日三者一致。

## R11. 面試展示:raw vs unified 對比面板(招牌)
**背景**:JD 核心是「整合三個不一致來源」,但原本無任何畫面可秀。grill 後確認這是最該補的展示缺口。
**作法**:
- 後端 `GET /raw/overview`:每來源一筆原始 payload + raw 統計(總筆數、批次數、各來源筆數)+ unified 統計(總筆數、日期範圍)。
- 前端 `RawUnifiedPanel`(Dashboard 第一個面板):
  1. **對應表**:統一欄位 × 三來源,格內顯示「原始欄位名 + 樣本值」(Meta 金額標 USD),一眼看出 `campaign`/`ad_set_name`/`session_campaign`、日期格式、幣別的差異 → 統一。
  2. **統計列**:raw(append-only,重跑會漲)vs unified(upsert,冪等不漲),把兩層設計差異視覺化。
**附帶結論(無需 backfill 按鈕)**:`MOCK_HISTORY_DAYS=90`,跑一次 ETL 即載入 90 天歷史;before/after 與 incremental/冪等 用現有「執行 ETL」重跑即可演(raw 漲、unified 不漲)。

## R12. Mock 成效體質 + 每日波動因子(增加 spread 與每日洗牌)
**背景**:原本三來源用同一組隨機範圍,多天 × 8 活動平均後收斂 → ROAS/預算看起來很平均。
**作法**:
1. **各來源 profile**(`SOURCE_PROFILE`):不同 ctr/cvr/cpc/aov/曝光規模 → 平均 ROAS 拉開、預算分配不再各 1/3。
2. **每來源每日共用波動因子**(`_daily_factor`,seeded by (source,date)):uniform(0.45,1.85) 套在當日營收上。因為是「當天該來源共用」,不會被多活動平均抵銷 → 每日 ROAS 大幅擺動且各來源範圍重疊 → 每天「哪家最高」會洗牌。

**整體 spread(平均 ROAS,依視窗)**:
- 近 14 天(儀表板實際視窗,見 R10/frontend.md):google ~5.0 / ga4 ~3.3 / meta ~2.8。
- 近 90 天(單次 ETL 載入範圍):google ~4.6 / ga4 ~3.4 / meta ~2.7。
> 數字會隨「今天」滑動而略有變動(日期種子),上述為 2026-06-10 之代表值。

**每日洗牌(最高 ROAS 來源次數)**:
- 近 14 天:google 11、ga4 2、meta 1。
- 近 90 天:google 62、ga4 19、meta 9。
> google 平均最強故最常贏,但非每天——符合真實。

**可視化**:前台「各來源每日 ROAS」折線圖呈現每日洗牌、「各來源 ROAS(近 14 天平均)」長條呈現 spread(change `add-per-source-daily-roas`)。

**仍維持冪等(D2)**:因子以 (source,date) 為種子,同一天重跑相同。

## R13. AI 洞察報告:兩段式視窗(營運 14 天 / 策略 30 天)
**背景**:前台已統一 14 天視窗(R10/R12),但洞察 `generate_insights` 仍呼叫 `compute_summary(db)`(吃全部 90 天)→ 報告引用的 ROAS 與儀表板「近 14 天」長條/KPI 對不上,同頁兩個數字打架。
**grill 拍板**:
1. **維持快照(D4)**:報告仍在 ETL 當下生成、存 DB 快取,1 次 Gemini;`GET /insights` 不變(單筆、無 window 參數)。不做「使用者自由選範圍」(會破壞快取,且每選一次要即時打 Gemini)。
2. **兩段式(刻意的不同時間鏡頭,非 bug)**:
   - **即時營運概覽 · 近 14 天**:圖表/KPI,吃前台「檢視截止日」日期鈕。
   - **月度策略建議 · 近 30 天**:洞察報告,**不吃日期鈕**(完全脫鉤),永遠「最新同步資料日往回 30 天」。
3. **ETL 載 90 天不變**(ingestion 層,使用者看不到;30 天恆在範圍內 → 一定有完整資料)。
**連動規則 / 實作**:
- 後端 `generate_insights`:`compute_summary(db)` → `compute_summary(db, days=30)`;prompt 加註「以下為近 30 天彙總」,使理由文字引用正確期間。
- 前端 `WINDOW_DAYS=14` 維持;`getInsights()` 從「切日期就重抓」的 Promise.all 移出,只載一次(報告不吃日期鈕)。
- `InsightCard` 加標題「月度策略建議 · 近 30 天」+「截至最後同步 {日期}」;營運側圖表明寫「近 14 天」,讓兩段式對比清楚。
- 版面:同頁、獨立區塊,**上圖表、下報告**(先數據後結論)。
**面試說法**:把「即時營運監控」與「月度策略建議」分開,因兩者時間尺度本就不同(短線洗牌 vs 月度預算分配),呼應 R10/R12。

## R14. AI 後備供應商:OpenRouter → NVIDIA NIM(實作後追加)
**背景**:原本後備供應商(Gemini 重試耗盡後)為 OpenRouter 免費模型;改用 NVIDIA NIM(`https://integrate.api.nvidia.com/v1`,OpenAI 相容)。
**作法**:
- 設定改名:`OPENROUTER_*` → `NVIDIA_API_KEY` / `NVIDIA_MODEL`(預設 `deepseek-ai/deepseek-v4-flash`)/ `NVIDIA_BASE_URL`;另加 `NVIDIA_MAX_TOKENS=16384`、`NVIDIA_REASONING_EFFORT=high`。
- `insights._call_nvidia` 改用官方 **openai SDK**(`OpenAI(base_url, api_key)`)取代 httpx;`temperature=1, top_p=0.95, max_tokens`,`extra_body={"chat_template_kwargs":{"thinking":True,"reasoning_effort":...}}` 開 thinking。
- **thinking 模型分流**:抽 `reasoning`/`reasoning_content` 僅記 log,只回 `message.content`(即要的 JSON),交既有 `_strip_code_fence`/`_parse_items` 解析(沿用 D9 降級)。
- **不送 `response_format`**:部分 NIM 模型不支援,改靠 prompt 指示 + 去程式碼框。
- 重試/降級不變:暫時性錯誤(429/503)指數退避(R7);`_is_transient` 補看 SDK 例外的 `status_code`。
**連動規則**:`requirements.txt` 新增 `openai`;改了相依需重建後端映像(`docker compose build --no-cache backend`)。

## R15. AI 洞察輸入增強:前期比較 + 佔比落差(實作後追加)
**背景**:洞察報告(月度策略建議)原只餵「近 30 天單一彙總快照」給 LLM → 建議理由停留在靜態 KPI 描述,無法展現動態分析深度。
**grill 拍板**:只加 LLM 輸入,輸出 schema / 前端 / API 全不動;展示目的為「展現會分析」。
**作法**:
- 新增 `compute_insight_summary(db)` 於 `analytics.py`(不動 `compute_summary`):以 `max_date` 為錨點,切近30 `[max_date-29, max_date]` / 前30 `[max_date-59, max_date-30]` 兩視窗,確定性算好以下欄位交給 LLM:
  - **`delta_pct`**:近30 vs 前30 的四指標百分比變化(`roas`/`cost_twd`/`revenue_twd`/`conversions`)。
  - **`revenue_share`**:近30天該來源營收佔比。
  - **`efficiency_gap`**:`revenue_share − budget_share`(正=高效該加、負=低效該減)。
- **防呆**:前期 cost=0 或無記錄 → `prior=null`、`delta_pct=null`;prompt 要求 LLM 改述「新投放、無前期可比」不捏造數字。
- **Prompt 強制**:每條 reason 至少引用一個確定性數字(`delta_pct` 或 `efficiency_gap`),除非 `prior=null`。
- ETL 載 90 天不變;`generate_insights` 僅換一個呼叫(`compute_summary → compute_insight_summary`),R13 兩段式快照架構不變。
**測試**:新增 `tests/test_insight_summary.py`(SQLite in-memory,6 個測試:空 DB、視窗錨點、delta_pct 計算、efficiency_gap 正負、prior=null 降級、revenue_share 合計)。
**連動規則**:免 migration;重建後端映像即可(`docker compose up --build backend`)。

## R16. AI 洞察輸出增強:整體建議敘述 + 效率落差圖(實作後追加)
**背景**:R15 只加輸入、輸出不動 → 前台策略卡片視覺無變化。使用者要求卡片「多一些東西」(整體敘述 + 圖表)。change `enrich-strategy-card-output`。
**作法**:
- **輸出由陣列改物件** `{summary, recommendations}`:prompt 要求 LLM 多吐一段整體策略摘要(`summary`,綜合三來源動能與效率落差);`_parse_items` → `_parse_insight` 回傳 `(summary, items)`,相容舊版純陣列。
- **`metrics` 隨洞察一起快照**:`_build_metrics` 從 `compute_insight_summary` 抽每來源 `efficiency_gap`/`revenue_share`/`budget_share`/`roas_delta_pct`,存進 `Insight.content`,`GET /insights` 一次帶出(不另開即時 API,符 R13 快照)。
- **metrics 與 LLM 脫鉤(關鍵分層)**:`generate_insights` 在缺 key/呼叫失敗/解析失敗等**所有降級分支都存 metrics** → 效率落差圖恆可顯示,只有 `summary` 與逐條建議會缺省。體現「確定性數字保證可用 vs 生成式文字盡力而為」。
- **前端**:`InsightCard` 頂部加「整體建議」敘述區塊;新增 `EfficiencyGapChart`(效率落差分歧長條,`efficiency_gap×100` 轉百分點 pp,正綠負紅 + `ReferenceLine x=0`);`PublicDashboard` 策略卡片順序維持「ROAS/CPA 圖 → 效率落差圖 → 整體建議+逐條」(先數據後結論,R13)。
**連動規則**:`Insight.content` 為 JSONB,免 migration;summary/metrics 為 ETL 快照 → 需重跑 ETL 才出現,舊記錄以可選欄位優雅降級。重建前後端映像(`docker compose up --build`)。
