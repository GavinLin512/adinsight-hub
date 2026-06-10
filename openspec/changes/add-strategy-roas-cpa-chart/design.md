## Context

R13 將前台拆為兩段式:營運(近 14 天,吃日期鈕)與月度策略(近 30 天,脫鉤日期鈕)。策略區塊目前只有 AI 文字建議,缺對應數據圖。`GET /analytics/summary` 已支援 `days`,`getSummary(endDate?, days?)` 的 `endDate` 可省略,故 `getSummary(null, 30)` 即可取得「最新資料日往回 30 天」各來源 KPI。`SourceKpi` 已含 `roas` 與 `cpa`。既有 `RoasChart.tsx` 提供 shadcn Charts + `sourceChartConfig` 的單軸長條範式可參考。

## Goals / Non-Goals

**Goals:**
- 策略區塊出現一張各來源近 30 天平均 ROAS / CPA 對比圖,與報告同窗。
- 與報告一致脫鉤日期鈕(mount 載一次)。
- 沿用既有圖表慣例與色票,風格一致。

**Non-Goals:**
- 不改後端(端點已支援 `days`)。
- 不改 `SourceKpi` 型別(已有 `roas`/`cpa`)。
- 不動營運側 14 天圖表與既有 `RoasChart`(該圖屬營運區塊,吃日期鈕,維持不變)。
- 不做使用者可選區間。

## Decisions

- **單圖雙 Y 軸分組長條**:ROAS 走左軸、CPA 走右軸,每來源兩根 bar(使用者已拍板)。理由:符合「一張圖」訴求且兩指標量級差距大(ROAS ~3–5x、CPA ~數百元)不能共軸。替代方案:兩張並排圖(最不易誤讀但非單圖)— 已否決。
- **方向相反的防呆**:ROAS 越高越好、CPA 越低越好 → 圖例/軸標題明寫單位(`ROAS (x)` / `CPA (NT$)`)並加一行說明,避免「CPA 長 bar 看起來很好」的誤讀。
- **資料來源 `getSummary(null, 30)`**:無 `end_date`、`days=30`,與洞察報告同一錨點(最新資料日往回 30 天),確保圖與文字口徑一致。不複用營運側 `summary`(那是 14 天且吃日期鈕)。
- **脫鉤日期鈕**:在 mount 與 `loadInsights` 同階段取一次策略摘要;`onDateChange` 不重抓。維持 R13 兩段式語意。
- **元件化**:新增 `StrategyKpiChart.tsx`(props 收 `SourceKpi[]`),與 `RoasChart` 平行,不污染營運元件。

## Risks / Trade-offs

- [雙 Y 軸易被誤讀(兩軸刻度不同)] → 圖例與軸標題標單位、加方向說明文字;ROAS、CPA 用可區分的視覺(顏色/圖例)。
- [某來源 CPA 為 null(conversions=0)] → 該來源 CPA bar 不渲染(資料層濾除 null),ROAS bar 照常;全部 null 時顯示空狀態文字,不崩潰。
- [策略摘要與報告若視窗不一致會再現矛盾] → 兩者皆用「無 end_date + days=30」同一取法,口徑綁定。
