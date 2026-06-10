## ADDED Requirements

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
