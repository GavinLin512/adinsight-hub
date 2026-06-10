## ADDED Requirements

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
