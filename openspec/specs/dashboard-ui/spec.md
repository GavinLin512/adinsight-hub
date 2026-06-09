# dashboard-ui Specification

## Purpose
TBD - created by archiving change add-marketing-data-hub. Update Purpose after archive.
## Requirements
### Requirement: React Dashboard 可視化
系統 SHALL 提供 React + Vite 前端,透過 Axios 呼叫後端 API 並以 Recharts 呈現行銷數據。

#### Scenario: 顯示 ROAS 長條圖
- **WHEN** Dashboard 載入並取得 `GET /analytics/summary`
- **THEN** 以長條圖呈現各來源/活動的 ROAS

#### Scenario: 顯示預算分配圓餅圖
- **WHEN** Dashboard 取得分析摘要
- **THEN** 以圓餅圖呈現各來源預算佔比

#### Scenario: 顯示 AI 洞察卡片
- **WHEN** Dashboard 取得 `GET /insights`
- **THEN** 以卡片元件顯示 Gemini 產出的洞察文字

#### Scenario: 後端尚無資料
- **WHEN** 後端尚未跑過 ETL,API 回傳空資料
- **THEN** 前端顯示適當的空狀態提示而非崩潰

