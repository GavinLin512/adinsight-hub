# deployment Specification

## Purpose
TBD - created by archiving change add-marketing-data-hub. Update Purpose after archive.
## Requirements
### Requirement: Docker Compose 一鍵啟動
系統 SHALL 以 Docker Compose 編排 db、backend、frontend 三個服務,單一指令即可啟動全套。

#### Scenario: 一鍵啟動全套
- **WHEN** 執行 `docker compose up`
- **THEN** PostgreSQL、FastAPI、Vite 三服務皆啟動
- **AND** backend 能連上 db,frontend 能呼叫 backend

#### Scenario: 啟動順序與 DB readiness
- **WHEN** 啟動服務
- **THEN** db 設有 healthcheck,backend 等待 db ready
- **AND** backend entrypoint 先執行 `alembic upgrade head` 再啟動 FastAPI
- **AND** 連線具重試,DB 未就緒時不直接崩潰

### Requirement: CORS 設定
系統 SHALL 於 FastAPI 啟用 CORS,允許前端來源呼叫 API。

#### Scenario: 前端跨來源呼叫
- **WHEN** 前端(http://localhost:5173)呼叫後端 API
- **THEN** 請求不被瀏覽器 CORS 政策阻擋

### Requirement: 環境變數設定
系統 SHALL 以 `.env`(附 `.env.example` 範本)管理資料庫連線、Gemini API key 與 USD→TWD 匯率,不得將密鑰寫死於程式碼。

#### Scenario: 透過環境變數注入設定
- **WHEN** 服務啟動
- **THEN** 從環境變數讀取 DB 連線字串、Gemini API key 與 `USD_TWD_RATE`

#### Scenario: 密鑰不進版控
- **WHEN** 檢視版控
- **THEN** `.env` 被 `.gitignore` 排除,僅 `.env.example` 範本入庫

### Requirement: 健康檢查端點
系統 SHALL 提供 `GET /health` 供健康檢查。

#### Scenario: 健康檢查回應
- **WHEN** 呼叫 `GET /health`
- **THEN** 回傳服務存活狀態(如 `{"status": "ok"}`)

