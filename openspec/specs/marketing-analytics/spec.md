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

