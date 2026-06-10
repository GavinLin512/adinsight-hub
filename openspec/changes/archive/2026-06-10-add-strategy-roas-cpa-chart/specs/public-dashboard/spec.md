## ADDED Requirements

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
