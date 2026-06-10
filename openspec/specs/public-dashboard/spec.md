# public-dashboard Specification

## Purpose
TBD - created by archiving change redesign-frontend-shadcn. Update Purpose after archive.
## Requirements
### Requirement: 前台只讀儀表板
前台 `/` SHALL 僅呈現對外的分析內容,不含任何維運控制項(執行 ETL、容錯測試、資料孤島、最後同步狀態)。前台分為兩段式時間鏡頭:**即時營運概覽(近 14 天)** 受「檢視截止日」過濾;**月度策略建議(近 30 天)** 的 AI 洞察報告**不受**「檢視截止日」影響。

#### Scenario: 前台內容範圍
- **WHEN** 使用者造訪 `/`
- **THEN** 顯示整體 KPI、各來源 ROAS、預算分配、每日趨勢(即時營運概覽 · 近 14 天)
- **AND** 顯示 AI 洞察(月度策略建議 · 近 30 天)
- **AND** 不顯示執行 ETL / 容錯測試 / 資料孤島 / 最後同步狀態等後台控制項

#### Scenario: 檢視截止日過濾(僅影響營運區塊)
- **WHEN** 使用者於前台選擇檢視截止日
- **THEN** 以 `end_date` 重新取數,營運區塊(KPI 與趨勢圖,近 14 天)即時更新
- **AND** 月度策略建議(AI 洞察報告)不重抓、不變動

#### Scenario: 洞察報告錨點固定
- **WHEN** 使用者切換檢視截止日至過去某日
- **THEN** AI 洞察報告仍呈現「最新同步資料日往回 30 天」的內容
- **AND** 報告標示「截至最後同步」的日期,使其與營運區塊的時間鏡頭區別清楚

#### Scenario: 空狀態
- **WHEN** 後端尚無資料
- **THEN** 顯示空狀態提示,引導至後台執行 ETL,而非崩潰

### Requirement: 兩段式視窗標示
前台 SHALL 在版面上明確標示兩段式時間鏡頭:營運區塊標示「近 14 天」,AI 洞察區塊標示「月度策略建議 · 近 30 天」與「截至最後同步 {日期}」,版面順序為上(營運圖表)、下(策略報告)。

#### Scenario: 區塊標題與順序
- **WHEN** 前台渲染儀表板
- **THEN** 營運圖表/KPI 區塊明寫「近 14 天」
- **AND** AI 洞察區塊以獨立區塊呈現,標題含「月度策略建議 · 近 30 天」與「截至最後同步 {日期}」
- **AND** 版面順序為營運圖表在上、策略報告在下

### Requirement: shadcn 化的視覺與圖表
前台 SHALL 以 shadcn 元件(Card 等)排版,圖表 SHALL 使用 shadcn Charts(`ChartContainer` + `chartConfig`,底層 Recharts)。

#### Scenario: 一致的卡片與圖表主題
- **WHEN** 前台渲染圖表與面板
- **THEN** 面板以 shadcn Card 呈現
- **AND** ROAS 長條圖、預算圓餅圖、每日趨勢圖以 shadcn Charts 呈現,套用統一 `chartConfig` 主題與 tooltip/legend

### Requirement: 各來源每日 ROAS 折線圖
前台 SHALL 顯示「各來源每日 ROAS」多線折線圖(google / meta / ga4 各一條),以 shadcn Charts 呈現,呈現每日各來源 ROAS 的擺動與交叉。

#### Scenario: 顯示三來源每日 ROAS
- **WHEN** 前台載入並取得 `GET /analytics/timeseries-by-source`
- **THEN** 以折線圖顯示每個來源每日 ROAS(最近 N 天)
- **AND** 套用統一 `chartConfig` 色票與 tooltip/legend

#### Scenario: 隨檢視截止日變化
- **WHEN** 使用者切換檢視截止日
- **THEN** 此折線圖一併以 `end_date` 重新取數更新

#### Scenario: 空狀態
- **WHEN** 尚無資料
- **THEN** 顯示空狀態提示而非崩潰

### Requirement: 月度策略 ROAS / CPA 對比圖
前台「月度策略建議 · 近 30 天」區塊 SHALL 顯示一張各來源近 30 天平均 ROAS 與 CPA 的長條圖,以 shadcn Charts(`ChartContainer` + `sourceChartConfig`,底層 Recharts)呈現。圖表資料 SHALL 取自 `GET /analytics/summary`(`days=30`、無 `end_date`),與該區塊 AI 報告同一視窗(最新資料日往回 30 天),且 SHALL **不受**「檢視截止日」日期鈕影響。

#### Scenario: 顯示各來源近 30 天 ROAS / CPA
- **WHEN** 前台載入並取得近 30 天各來源 KPI
- **THEN** 以長條圖顯示每個來源的平均 ROAS 與 CPA
- **AND** ROAS 與 CPA 因量級不同,分置左、右兩個 Y 軸
- **AND** 圖例與軸標題標示單位(ROAS 為倍數、CPA 為 NT$)並說明「ROAS 越高越好、CPA 越低越好」

#### Scenario: 與報告同窗且脫鉤日期鈕
- **WHEN** 使用者切換「檢視截止日」
- **THEN** 此策略圖不重抓、不變動(僅營運區塊更新)

#### Scenario: CPA 分母為零
- **WHEN** 某來源近 30 天 `conversions=0`(CPA 為 null)
- **THEN** 該來源的 CPA 長條不顯示,ROAS 長條照常呈現,不崩潰

#### Scenario: 空狀態
- **WHEN** 近 30 天尚無資料
- **THEN** 顯示空狀態提示而非崩潰

#### Scenario: 版面順序
- **WHEN** 前台渲染「月度策略建議」區塊
- **THEN** ROAS / CPA 圖表在上、AI 逐條建議列表在下,同屬一張策略卡片

### Requirement: 策略卡片整體建議與效率落差
前台「AI 月度策略建議 · 近 30 天」卡片 SHALL 在逐條建議之外,額外呈現:
1. **整體建議敘述**:顯示洞察 `summary`(LLM 綜合三來源的整體策略摘要),置於逐條建議上方並以視覺強調(如左色條區塊)。
2. **預算效率落差圖**:以 shadcn Charts 呈現各來源 `efficiency_gap`(營收佔比 − 預算佔比)的分歧長條,正值與負值以不同顏色區分(正=該加、負=該減),並標註單位與正負語意。

資料皆取自 `GET /insights`(`summary` 與 `metrics`),與該卡片同一快照、同一近 30 天視窗,且 SHALL **不受**「檢視截止日」日期鈕影響。版面 SHALL 維持「先數據後結論」:ROAS/CPA 圖 → 效率落差圖 → 整體建議 + 逐條建議。

#### Scenario: 顯示整體建議敘述
- **WHEN** 前台載入且洞察含 `summary`
- **THEN** 在策略卡片顯示整體建議敘述段落,位於逐條建議上方

#### Scenario: 顯示效率落差圖
- **WHEN** 前台載入且洞察含 `metrics`
- **THEN** 以分歧長條圖顯示各來源效率落差,正負值以不同顏色區分並標註語意

#### Scenario: 效率落差圖與 LLM 成敗脫鉤
- **WHEN** 洞察的 `summary`/逐條建議因 LLM 失敗而缺省,但 `metrics` 仍存在
- **THEN** 效率落差圖仍正常顯示,整體建議敘述則不顯示,頁面不崩潰

#### Scenario: 舊洞察記錄無新欄位
- **WHEN** 洞察記錄為舊版(無 `summary`/`metrics`)
- **THEN** 整體建議與效率落差圖以空狀態/不顯示優雅降級,既有逐條建議照常呈現

#### Scenario: 不受檢視截止日影響
- **WHEN** 使用者切換「檢視截止日」
- **THEN** 整體建議與效率落差圖不重抓、不變動(僅營運區塊更新)
