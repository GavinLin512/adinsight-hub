## Why

各來源 ROAS 長條圖是 90 天彙總,顯示穩定的整體差距(google > ga4 > meta),但看不出「**每天哪家最高其實會洗牌**」。為了讓 mock 資料更真實、demo 更有畫面(展現每日成效波動),需要一張「各來源每日 ROAS」折線圖,以及支援它的每日 × 各來源彙總端點。

同時,mock 產生器已加入「每來源每天共用的波動因子」,讓每日 ROAS 大幅擺動且各來源範圍重疊(整體平均仍維持 spread、仍冪等),本變更將此資料行為正式納入規格。

## What Changes

- 後端新增 `GET /analytics/timeseries-by-source`:回傳每日 × 各來源的彙總(date、source、cost、revenue、roas),支援 `end_date` 過濾。
- 前台新增「各來源每日 ROAS」多線折線圖(google / meta / ga4 三條線,會交叉),以 shadcn Charts 呈現。
- ETL 的 mock 數值納入「每來源每日共用波動因子」需求:每日 ROAS 擺動、每日最高來源會變,但整體平均仍有 spread,且以 (source, date) 為種子維持冪等。

## Capabilities

### New Capabilities
<!-- 無新增 capability,均為既有能力的延伸 -->

### Modified Capabilities
- `marketing-analytics`: 新增每日 × 各來源趨勢端點。
- `public-dashboard`: 前台新增各來源每日 ROAS 折線圖。
- `etl-pipeline`: mock 數值新增每來源每日波動(每日洗牌、仍冪等)。

## Impact

- 後端:`analytics.py` 新增 `compute_timeseries_by_source`;`main.py` 新增端點;`schemas.py` 新增回應型別。
- 前端:新增 `SourceRoasTrend` 圖表元件、`api.ts` 新增呼叫、`PublicDashboard` 加入該圖;型別 `types.ts` 補充。
- ETL:`mock_sources.py` 已加入 `SOURCE_PROFILE` 與 `_daily_factor`(本變更納入規格)。
- 資料庫、Docker 編排不變。
