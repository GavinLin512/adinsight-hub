## ADDED Requirements

### Requirement: Tailwind + shadcn 設定
前端 SHALL 導入 Tailwind CSS 與 shadcn/ui,並設定 `@` 路徑別名與 `components.json`,作為全站 UI 基礎。

#### Scenario: 樣式與元件基礎就緒
- **WHEN** 專案建置
- **THEN** Tailwind 指令(`@tailwind base/components/utilities`)生效
- **AND** `@/components/ui/*` 的 shadcn 元件可被匯入
- **AND** `vite.config.js` 與編輯器設定皆解析 `@` 至 `src`

### Requirement: react-router-dom 前後台路由
前端 SHALL 使用 react-router-dom 提供前台與後台分離路由。

#### Scenario: 路由配置
- **WHEN** 使用者造訪 `/`
- **THEN** 顯示前台只讀儀表板
- **WHEN** 使用者造訪 `/admin`
- **THEN** 顯示後台維運控制台
- **WHEN** 使用者造訪 `/admin/logs`
- **THEN** 顯示 ETL 執行紀錄

#### Scenario: 後台不設存取保護
- **WHEN** 任何使用者造訪 `/admin`
- **THEN** 可直接進入(MVP 不做認證)

### Requirement: 共用 Layout 與導覽
前端 SHALL 提供共用 Layout,含可於前台/後台間切換的導覽。

#### Scenario: 前後台切換
- **WHEN** 使用者在任一頁
- **THEN** 導覽提供前往前台 `/` 與後台 `/admin` 的連結
- **AND** 目前所在區段於導覽中標示
