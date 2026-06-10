"""compute_insight_summary 測試:視窗切割、delta_pct、efficiency_gap、降級(R3/D7)。"""
from datetime import date, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import UnifiedCampaign
from app.analytics import compute_insight_summary


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    # 只建 unified_campaigns,避免 JSONB 欄位(raw_campaigns)在 SQLite 報錯
    UnifiedCampaign.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


_id_counter = 0


def _row(source, d, cost, revenue, conversions=10, impressions=1000, clicks=50):
    global _id_counter
    _id_counter += 1
    return UnifiedCampaign(
        id=_id_counter,
        source=source,
        campaign_name="test",
        date=d,
        cost_twd=cost,
        revenue_twd=revenue,
        conversions=conversions,
        impressions=impressions,
        clicks=clicks,
    )


# max_date = today,近30=[today-29, today],前30=[today-59, today-30]
TODAY = date(2026, 6, 10)
CUR_START = TODAY - timedelta(days=29)
PRI_END = TODAY - timedelta(days=30)
PRI_START = TODAY - timedelta(days=59)


def test_empty_db_returns_empty(db):
    result = compute_insight_summary(db)
    assert result["by_source"] == []
    assert result["max_date"] is None


def test_window_uses_max_date_anchor(db):
    """只插入近30天資料,前30天無資料 → prior=null。"""
    db.add(_row("google", CUR_START, cost=500, revenue=2000))
    db.commit()
    result = compute_insight_summary(db)
    assert result["max_date"] == str(CUR_START)
    src = result["by_source"][0]
    assert src["prior"] is None
    assert all(v is None for v in src["delta_pct"].values())


def test_delta_pct_calculation(db):
    """近30天 ROAS=4(2000/500),前30天 ROAS=2(1000/500)→ delta +100%。"""
    db.add(_row("google", TODAY, cost=500, revenue=2000, conversions=10))
    db.add(_row("google", PRI_END, cost=500, revenue=1000, conversions=5))
    db.commit()

    result = compute_insight_summary(db)
    src = result["by_source"][0]
    assert src["delta_pct"]["roas"] == pytest.approx(100.0)
    assert src["delta_pct"]["revenue_twd"] == pytest.approx(100.0)
    assert src["delta_pct"]["cost_twd"] == pytest.approx(0.0)
    assert src["delta_pct"]["conversions"] == pytest.approx(100.0)


def test_efficiency_gap_sign(db):
    """google 拿 50% 預算貢獻 100% 營收 → efficiency_gap = 0.5(正)。
    meta   拿 50% 預算貢獻   0% 營收 → efficiency_gap = -0.5(負)。"""
    db.add(_row("google", TODAY, cost=500, revenue=2000))
    db.add(_row("meta",   TODAY, cost=500, revenue=0, conversions=0))
    db.commit()

    result = compute_insight_summary(db)
    by_src = {s["source"]: s for s in result["by_source"]}
    assert by_src["google"]["efficiency_gap"] > 0
    assert by_src["meta"]["efficiency_gap"] < 0


def test_prior_null_when_no_prior_cost(db):
    """前期 cost=0 視同無前期資料 → prior=null。"""
    db.add(_row("google", TODAY, cost=500, revenue=2000))
    db.add(_row("google", PRI_END, cost=0, revenue=0, conversions=0))
    db.commit()

    result = compute_insight_summary(db)
    src = result["by_source"][0]
    assert src["prior"] is None
    assert all(v is None for v in src["delta_pct"].values())


def test_multi_source_revenue_share(db):
    """三來源,revenue_share 加總應等於 1(或接近,因浮點)。"""
    for src in ("google", "meta", "ga4"):
        db.add(_row(src, TODAY, cost=300, revenue=1000))
    db.commit()

    result = compute_insight_summary(db)
    total_share = sum(s["revenue_share"] for s in result["by_source"])
    assert total_share == pytest.approx(1.0, abs=0.001)
