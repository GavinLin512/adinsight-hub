# marketing-analytics Specification

## Purpose
TBD - created by archiving change add-marketing-data-hub. Update Purpose after archive.
## Requirements
### Requirement: 行銷 KPI 計算
系統 SHALL 依 unified 層資料計算 ROAS、CPA、CTR 與各來源預算佔比。

#### Scenario: KPI 公式
- **WHEN** 分析層彙整資料
- **THEN** ROAS = revenue_twd / cost_twd
- **AND** CPA = cost_twd / conversions
- **AND** CTR = clicks / impressions
- **AND** 預算佔比 = 各來源 cost_twd / 全部 cost_twd 總和

#### Scenario: 分母為零的防護
- **WHEN** 任一 KPI 的分母為 0,包含 CTR(impressions=0)、CPA(conversions=0)、ROAS(cost=0)、預算佔比(總 cost=0)
- **THEN** 該 KPI 回傳 null 或 0,且不得拋出除以零錯誤

### Requirement: 分析摘要端點
系統 SHALL 提供 `GET /analytics/summary` 回傳整體與分來源的 KPI 摘要,並支援 `end_date` 只看該日(含)以前的資料。

#### Scenario: 取得 KPI 摘要
- **WHEN** 呼叫 `GET /analytics/summary`
- **THEN** 回傳整體 KPI 與依來源/活動分組的 ROAS、CPA、CTR、預算佔比

#### Scenario: 以檢視截止日過濾
- **WHEN** 呼叫 `GET /analytics/summary?end_date=YYYY-MM-DD`
- **THEN** 僅彙總該日(含)以前的 unified 資料
- **AND** 往較晚日期前推時總額單調增加

### Requirement: 每日趨勢端點
系統 SHALL 提供 `GET /analytics/timeseries` 回傳每日彙總(date 維度)的花費、收入、ROAS、轉換,供趨勢圖呈現,並支援 `end_date` 過濾。

#### Scenario: 取得每日趨勢
- **WHEN** 呼叫 `GET /analytics/timeseries`
- **THEN** 回傳依日期排序的每日彙總序列
- **AND** 不同 `end_date` 會改變序列的涵蓋範圍

### Requirement: 每日 × 各來源趨勢端點
系統 SHALL 提供 `GET /analytics/timeseries-by-source` 回傳每日且分來源的彙總(花費、收入、ROAS),供前端呈現各來源每日 ROAS 折線,並支援 `end_date` 過濾。

#### Scenario: 取得每日各來源趨勢
- **WHEN** 呼叫 `GET /analytics/timeseries-by-source`
- **THEN** 回傳依日期排序、每筆含 `date`、`source`、`cost_twd`、`revenue_twd`、`roas` 的序列
- **AND** ROAS 分母(cost)為 0 時回傳 null,不拋錯

#### Scenario: 以檢視截止日過濾
- **WHEN** 呼叫 `GET /analytics/timeseries-by-source?end_date=YYYY-MM-DD`
- **THEN** 僅回傳該日(含)以前的每日各來源資料

### Requirement: 洞察專用彙總(前期比較 + 佔比落差)
系統 SHALL 提供洞察專用彙總函式 `compute_insight_summary(db)`,以最新資料日 `max_date` 為錨點,計算近 30 天與前 30 天兩個視窗的各來源 KPI,並由後端確定性算好前期百分比變化與佔比落差,供 AI 洞察 prompt 使用。此函式獨立於 `compute_summary`(前台儀表板續用後者,不受影響)。

視窗定義:
- 近 30 天 = `[max_date-29, max_date]`
- 前 30 天 = `[max_date-59, max_date-30]`

每來源輸出 SHALL 至少包含:
- `current`:近 30 天 KPI(含 `roas`、`cost_twd`、`revenue_twd`、`conversions`、`cpa`、`ctr`、`budget_share`)。
- `revenue_share`:近 30 天該來源營收佔比(該來源 `revenue_twd` / 全部 `revenue_twd`)。
- `efficiency_gap`:`revenue_share − budget_share`(正值代表多賺少花、負值代表多花少賺)。
- `delta_pct`:近 30 天相對前 30 天的百分比變化,對 `roas`、`cost_twd`、`revenue_twd`、`conversions` 四個指標各一。
- `prior`:前 30 天對應指標(供追溯)。

#### Scenario: 兩視窗以最新資料日為錨點
- **WHEN** 呼叫 `compute_insight_summary(db)` 且 unified 層有資料
- **THEN** 近 30 天視窗為 `[max_date-29, max_date]`、前 30 天視窗為 `[max_date-59, max_date-30]`
- **AND** 兩視窗皆以同一個 `max_date` 為錨點

#### Scenario: 計算前期百分比變化
- **WHEN** 某來源前 30 天與近 30 天皆有資料
- **THEN** 對 `roas`、`cost_twd`、`revenue_twd`、`conversions` 各回傳 `delta_pct`(= (近 − 前) / 前 × 100,四捨五入)
- **AND** 數值由後端算好,不依賴 LLM 計算

#### Scenario: 計算佔比落差
- **WHEN** 彙整近 30 天各來源資料
- **THEN** 每來源回傳 `revenue_share`(營收佔比)與 `efficiency_gap`(營收佔比 − 預算佔比)
- **AND** `efficiency_gap` 為正代表營收貢獻高於預算佔用,為負則相反

#### Scenario: 前期無資料的降級
- **WHEN** 某來源前 30 天無花費或無資料
- **THEN** 該來源 `prior` 回傳 null、`delta_pct` 各項回傳 null
- **AND** 不得拋出除以零或其他錯誤

#### Scenario: unified 層完全無資料
- **WHEN** unified 層沒有任何資料(`max_date` 不存在)
- **THEN** 回傳空彙總(無來源項目),不得崩潰

