## 1. 後端:洞察改近 30 天視窗

- [x] 1.1 `backend/app/insights.py` `generate_insights`:`compute_summary(db)` 改為 `compute_summary(db, days=30)`
- [x] 1.2 `_PROMPT_TEMPLATE` 加註資料期間為「近 30 天」,使理由文字引用正確期間
- [x] 1.3 確認 `GET /insights`、schema、`compute_summary` 皆未更動(維持 D4 單筆快取)

## 2. 前端:報告脫鉤日期鈕

- [x] 2.1 `frontend/src/pages/PublicDashboard.tsx`:將 `getInsights()` 從 `endDate` 觸發的 `Promise.all` 移出,改為只在初次載入抓一次
- [x] 2.2 確認切換「檢視截止日」時營運區塊(KPI/趨勢,近 14 天)重抓、洞察報告不重抓
- [x] 2.3 確認 `WINDOW_DAYS=14` 維持不變

## 3. 前端:兩段式標示與版面

- [x] 3.1 `frontend/src/components/InsightCard.tsx`:加標題「月度策略建議 · 近 30 天」與「截至最後同步 {日期}」副標
- [x] 3.2 取得並顯示洞察的最後同步日期(由 `InsightOut` 或 `etl_runs` 來源)
- [x] 3.3 營運側圖表/KPI 明寫「近 14 天」(ROAS 長條等標題)
- [x] 3.4 確認版面順序:營運圖表在上、策略報告在下,且報告為獨立區塊

## 4. 驗證

- [x] 4.1 後端跑既有 pytest(KPI/冪等)確認未回歸(需 Docker 環境)
- [x] 4.2 前端 `pnpm run build`(含 `tsc --noEmit`)通過
- [x] 4.3 手動:重跑 ETL → 報告數字反映近 30 天;切換檢視截止日 → 圖表動、報告不動
