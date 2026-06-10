## ADDED Requirements

### Requirement: 各來源差異化體質與每日波動
mock 產生器 SHALL 讓各來源具不同成效體質(CTR/CVR/CPC/客單價/曝光規模),使**整體**平均 ROAS 與預算分配拉開幅度;並對每來源每天套用一個共用波動因子,使**每日** ROAS 大幅擺動、各來源範圍重疊,讓「每日最高來源」會洗牌。波動因子以 `(source, date)` 為種子,維持冪等。

#### Scenario: 整體有 spread
- **WHEN** 跑完一段期間的 ETL 並計算各來源平均 ROAS
- **THEN** 各來源平均 ROAS 明顯不同(非趨近相等)

#### Scenario: 每日最高來源會洗牌
- **WHEN** 檢視每日各來源 ROAS
- **THEN** 不同日期「最高 ROAS 的來源」並非固定同一家

#### Scenario: 仍維持冪等
- **WHEN** 同一天重跑 ETL
- **THEN** 含波動因子在內的數值完全相同
