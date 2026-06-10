# public-dashboard Specification

## Purpose
TBD - created by archiving change redesign-frontend-shadcn. Update Purpose after archive.
## Requirements
### Requirement: 前台只讀儀表板
前台 `/` SHALL 僅呈現對外的分析內容,不含任何維運控制項(執行 ETL、容錯測試、資料孤島、最後同步狀態)。

#### Scenario: 前台內容範圍
- **WHEN** 使用者造訪 `/`
- **THEN** 顯示整體 KPI、各來源 ROAS、預算分配、每日趨勢、AI 洞察
- **AND** 不顯示執行 ETL / 容錯測試 / 資料孤島 / 最後同步狀態等後台控制項

#### Scenario: 檢視截止日過濾
- **WHEN** 使用者於前台選擇檢視截止日
- **THEN** 以 `end_date` 重新取數,KPI 與趨勢圖即時更新

#### Scenario: 空狀態
- **WHEN** 後端尚無資料
- **THEN** 顯示空狀態提示,引導至後台執行 ETL,而非崩潰

### Requirement: shadcn 化的視覺與圖表
前台 SHALL 以 shadcn 元件(Card 等)排版,圖表 SHALL 使用 shadcn Charts(`ChartContainer` + `chartConfig`,底層 Recharts)。

#### Scenario: 一致的卡片與圖表主題
- **WHEN** 前台渲染圖表與面板
- **THEN** 面板以 shadcn Card 呈現
- **AND** ROAS 長條圖、預算圓餅圖、每日趨勢圖以 shadcn Charts 呈現,套用統一 `chartConfig` 主題與 tooltip/legend

