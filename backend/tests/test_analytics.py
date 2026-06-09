"""KPI 測試(D7/R3):算式正確 + 分母為零防護。"""
from app.analytics import compute_kpis

RECORDS = [
    {"source": "google", "impressions": 1000, "clicks": 100,
     "cost_twd": 500.0, "conversions": 10, "revenue_twd": 2000.0},
    {"source": "meta", "impressions": 2000, "clicks": 50,
     "cost_twd": 500.0, "conversions": 0, "revenue_twd": 0.0},
]


def test_roas_cpa_ctr():
    res = compute_kpis(RECORDS)
    google = next(s for s in res["by_source"] if s["source"] == "google")
    assert google["roas"] == 4.0          # 2000/500
    assert google["cpa"] == 50.0          # 500/10
    assert google["ctr"] == 0.1           # 100/1000


def test_budget_share():
    res = compute_kpis(RECORDS)
    shares = {s["source"]: s["budget_share"] for s in res["by_source"]}
    assert shares["google"] == 0.5        # 500/1000
    assert shares["meta"] == 0.5


def test_zero_denominator_guards():
    res = compute_kpis(RECORDS)
    meta = next(s for s in res["by_source"] if s["source"] == "meta")
    assert meta["cpa"] is None            # conversions=0
    assert meta["roas"] == 0.0            # revenue 0 / cost 500 = 0


def test_all_zero_does_not_crash():
    res = compute_kpis([
        {"source": "ga4", "impressions": 0, "clicks": 0,
         "cost_twd": 0.0, "conversions": 0, "revenue_twd": 0.0},
    ])
    ga4 = res["by_source"][0]
    assert ga4["ctr"] is None             # impressions=0
    assert ga4["roas"] is None            # cost=0
    assert ga4["budget_share"] is None    # 總 cost=0


def test_empty_records():
    res = compute_kpis([])
    assert res["overall"]["roas"] is None
    assert res["by_source"] == []
