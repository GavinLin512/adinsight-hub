## ADDED Requirements

### Requirement: 每日 × 各來源趨勢端點
系統 SHALL 提供 `GET /analytics/timeseries-by-source` 回傳每日且分來源的彙總(花費、收入、ROAS),供前端呈現各來源每日 ROAS 折線,並支援 `end_date` 過濾。

#### Scenario: 取得每日各來源趨勢
- **WHEN** 呼叫 `GET /analytics/timeseries-by-source`
- **THEN** 回傳依日期排序、每筆含 `date`、`source`、`cost_twd`、`revenue_twd`、`roas` 的序列
- **AND** ROAS 分母(cost)為 0 時回傳 null,不拋錯

#### Scenario: 以檢視截止日過濾
- **WHEN** 呼叫 `GET /analytics/timeseries-by-source?end_date=YYYY-MM-DD`
- **THEN** 僅回傳該日(含)以前的每日各來源資料
