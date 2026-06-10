## Why

前台已統一為「近 14 天」視窗(R10/R12),但 AI 洞察報告仍以全部 90 天資料(`compute_summary(db)`)產生,導致報告引用的 ROAS 與儀表板「近 14 天」的長條/KPI 對不上 —— 同一頁出現兩個矛盾的數字。需要消除矛盾,同時保留 D4「ETL 後一次算好、快取」的設計。

## What Changes

- AI 洞察報告改以 **近 30 天** 視窗產生(`compute_summary(db, days=30)`),定位為「月度策略建議」;ETL 載入 90 天與 `GET /insights` 單筆快取(無 window 參數)維持不變(D4 快照)。
- Gemini prompt 加註「以下為近 30 天彙總」,使理由文字引用正確期間。
- 前台改為**兩段式視窗**(刻意的不同時間鏡頭):
  - **即時營運概覽 · 近 14 天**:KPI、各來源 ROAS、預算、趨勢圖,吃「檢視截止日」日期鈕。
  - **月度策略建議 · 近 30 天**:AI 洞察報告,**完全脫鉤於日期鈕**,永遠呈現「最新同步資料日往回 30 天」。
- 洞察卡片加標題「月度策略建議 · 近 30 天」與「截至最後同步 {日期}」副標;營運側圖表/KPI 明寫「近 14 天」,讓兩段式對比清楚。
- 版面為同頁、獨立區塊,順序為**上圖表、下報告**。
- 前端 `getInsights()` 從「切日期就重抓」的 `Promise.all` 移出,改為只載一次。

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `ai-insights`: 洞察的彙總視窗由「全部資料」明確化為「近 30 天」,並於 prompt 註明期間;仍維持 ETL 後產生並快取、`GET /insights` 直接讀取。
- `public-dashboard`: AI 洞察改為獨立的「月度策略建議(近 30 天)」區塊,且**不受「檢視截止日」影響**(僅營運圖表受其過濾);新增兩段式視窗標示。

## Impact

- 後端:`backend/app/insights.py`(`generate_insights` 改帶 `days=30`、prompt 文案);不動 `GET /insights`、schema、`compute_summary`(已支援 `days`)。
- 前端:`frontend/src/pages/PublicDashboard.tsx`(`getInsights()` 移出日期觸發的 `Promise.all`)、`frontend/src/components/InsightCard.tsx`(標題/副標)、營運側圖表標示「近 14 天」。
- 行為變更:使用者切換「檢視截止日」時洞察報告不再重抓/變動(刻意);`WINDOW_DAYS=14` 維持。
