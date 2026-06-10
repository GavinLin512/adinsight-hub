## ADDED Requirements

### Requirement: 洞察以近 30 天視窗產生(月度策略)
系統 SHALL 在產生 AI 洞察時,以「最新資料日往回 30 天」的 KPI 摘要作為輸入(`compute_summary(db, days=30)`),並於 Gemini prompt 中註明資料期間為「近 30 天」,使建議定位為月度策略。ETL 載入範圍(90 天)與 `GET /insights` 單筆快取(無 window 參數)維持不變(D4)。

#### Scenario: 以近 30 天彙總產生洞察
- **WHEN** `POST /etl/run` 完成且 KPI 已計算
- **THEN** 系統以「最新資料日往回 30 天」的 KPI 摘要組成 prompt
- **AND** prompt 註明資料期間為「近 30 天」
- **AND** 將回傳洞察存入資料庫供 `GET /insights` 讀取

#### Scenario: 資料不足 30 天
- **WHEN** unified 層現有資料不足 30 天
- **THEN** 以現有可取得的天數彙總,不得拋錯或崩潰

#### Scenario: 維持單筆快取讀取
- **WHEN** 呼叫 `GET /insights`
- **THEN** 直接回傳最新一次產生的洞察,不接受也不需要視窗參數
