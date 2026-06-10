## 1. 後端彙總:compute_insight_summary

- [x] 1.1 在 `backend/app/analytics.py` 新增取單一視窗各來源彙總的輔助(重用 `compute_kpis`/`_safe_div`/`_round`),供近 30、前 30 兩視窗共用
- [x] 1.2 新增 `compute_insight_summary(db)`:以 `max_date` 為錨點切近 30 `[max_date-29, max_date]` 與前 30 `[max_date-59, max_date-30]` 兩視窗
- [x] 1.3 每來源輸出 `current`(roas/cost_twd/revenue_twd/conversions/cpa/ctr/budget_share)、`revenue_share`、`efficiency_gap`(= revenue_share − budget_share)
- [x] 1.4 計算四指標 `delta_pct`(roas/cost_twd/revenue_twd/conversions;公式 (近−前)/前×100,四捨五入)並附 `prior`
- [x] 1.5 降級:前期無花費 → `prior=null`、各 `delta_pct=null`;`max_date` 不存在 → 回空彙總,皆不崩潰

## 2. 洞察產生:generate_insights 與 prompt

- [x] 2.1 `backend/app/insights.py` 的 `generate_insights` 改呼叫 `compute_insight_summary(db)`(取代 `compute_summary(db, days=30)`)
- [x] 2.2 更新 `_PROMPT_TEMPLATE`:加入欄位中文說明(delta_pct/revenue_share/efficiency_gap 正負號語意),維持「近 30 天月度策略」定位
- [x] 2.3 prompt 規則:每條 reason 至少引用一個確定性數字(delta_pct 或 efficiency_gap),`prior=null` 來源改述「新投放、無前期可比」且不杜撰百分比
- [x] 2.4 確認輸出仍為 `{source, action, reason}`,D9 解析失敗/缺 key/呼叫失敗的降級路徑不變

## 3. 測試

- [x] 3.1 視窗切割正確(近 30 / 前 30 邊界、共用 max_date 錨點)
- [x] 3.2 `delta_pct` 計算正確(含四捨五入)、`efficiency_gap` 正負號正確
- [x] 3.3 前期無資料來源 `prior=null`/`delta_pct=null` 降級;unified 全空回空彙總不拋錯
- [x] 3.4 既有洞察測試與 `compute_summary` 相關測試仍綠燈(未受影響)

## 4. 驗證與收尾

- [x] 4.1 後端跑 `pytest` 全綠
- [x] 4.2 本機 `POST /etl/run` 後 `GET /insights` 檢視理由是否引用前期變化/效率落差,prior=null 來源描述正確
- [x] 4.3 確認前台 `InsightCard` 與 `GET /analytics/*` 行為不變(無前端改動)
- [x] 4.4 更新 `.claude/rules/decisions.md` 追加一條(R14 後接續)記錄本次洞察輸入增強
