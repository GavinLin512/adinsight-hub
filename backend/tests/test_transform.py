"""清洗測試(D7):欄位統一、USD→TWD、日期正規化。"""
from datetime import date

from app.etl.transform import transform_batch

RATE = 30.0

RAW = [
    {"source": "google", "raw_payload": {
        "campaign": "Brand_Search", "day": "2026-06-08",
        "impressions": 1000, "clicks": 100, "cost": 500.0,
        "conversions": 10, "conv_value": 3000.0,
    }},
    {"source": "meta", "raw_payload": {
        "ad_set_name": "Lookalike_Purchase", "date": "08/06/2026",
        "impressions": 2000, "link_clicks": 50, "spend": 10.0,   # USD
        "results": 5, "revenue": 100.0,                          # USD
    }},
    {"source": "ga4", "raw_payload": {
        "session_campaign": "summer_promo", "event_date": "20260608",
        "ad_impressions": 3000, "ad_clicks": 30, "ad_cost": 250.0,
        "conversions": 3, "total_revenue": 1500.0,
    }},
]


def test_columns_and_field_unification():
    df = transform_batch(RAW, rate=RATE)
    assert set(df["campaign_name"]) == {"Brand_Search", "Lookalike_Purchase", "summer_promo"}
    assert set(df["source"]) == {"google", "meta", "ga4"}


def test_date_normalized_across_formats():
    df = transform_batch(RAW, rate=RATE)
    assert set(df["date"]) == {date(2026, 6, 8)}


def test_meta_usd_converted_to_twd():
    df = transform_batch(RAW, rate=RATE)
    meta = df[df["source"] == "meta"].iloc[0]
    assert meta["cost_twd"] == 10.0 * RATE      # 300.0
    assert meta["revenue_twd"] == 100.0 * RATE  # 3000.0


def test_non_meta_currency_untouched():
    df = transform_batch(RAW, rate=RATE)
    google = df[df["source"] == "google"].iloc[0]
    assert google["cost_twd"] == 500.0


def test_missing_values_filled():
    raw = [{"source": "google", "raw_payload": {
        "campaign": "X", "day": "2026-06-08", "clicks": 5,  # 缺 impressions/cost...
    }}]
    df = transform_batch(raw, rate=RATE)
    row = df.iloc[0]
    assert row["impressions"] == 0
    assert row["cost_twd"] == 0
