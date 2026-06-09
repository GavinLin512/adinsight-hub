"""Transform:用 Pandas 把三來源異質資料清洗成統一 schema(D3/R4/R6)。

統一欄位:source, campaign_name, date, impressions, clicks,
         cost_twd, conversions, revenue_twd
- 欄位名統一、日期格式統一為純 date(R6)、Meta USD→TWD(R4)、缺值處理。
純函式,不碰 DB,便於測試(D7)。
"""
from __future__ import annotations

import logging

import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

UNIFIED_COLUMNS = [
    "source", "campaign_name", "date",
    "impressions", "clicks", "cost_twd", "conversions", "revenue_twd",
]

NUMERIC_COLUMNS = ["impressions", "clicks", "cost_twd", "conversions", "revenue_twd"]


def _normalize_google(p: dict, rate: float) -> dict:
    return {
        "source": "google",
        "campaign_name": p.get("campaign"),
        "date": pd.to_datetime(p.get("day"), format="%Y-%m-%d", errors="coerce"),
        "impressions": p.get("impressions"),
        "clicks": p.get("clicks"),
        "cost_twd": p.get("cost"),            # 已是 TWD
        "conversions": p.get("conversions"),
        "revenue_twd": p.get("conv_value"),   # 已是 TWD
    }


def _normalize_meta(p: dict, rate: float) -> dict:
    spend = p.get("spend")
    revenue = p.get("revenue")
    return {
        "source": "meta",
        "campaign_name": p.get("ad_set_name"),
        "date": pd.to_datetime(p.get("date"), format="%d/%m/%Y", errors="coerce"),
        "impressions": p.get("impressions"),
        "clicks": p.get("link_clicks"),
        "cost_twd": None if spend is None else spend * rate,        # USD→TWD
        "conversions": p.get("results"),
        "revenue_twd": None if revenue is None else revenue * rate,  # USD→TWD
    }


def _normalize_ga4(p: dict, rate: float) -> dict:
    return {
        "source": "ga4",
        "campaign_name": p.get("session_campaign"),
        "date": pd.to_datetime(p.get("event_date"), format="%Y%m%d", errors="coerce"),
        "impressions": p.get("ad_impressions"),
        "clicks": p.get("ad_clicks"),
        "cost_twd": p.get("ad_cost"),          # 已是 TWD
        "conversions": p.get("conversions"),
        "revenue_twd": p.get("total_revenue"),  # 已是 TWD
    }


_NORMALIZERS = {
    "google": _normalize_google,
    "meta": _normalize_meta,
    "ga4": _normalize_ga4,
}


def transform_batch(raw_records: list[dict], rate: float | None = None) -> pd.DataFrame:
    """raw_records: [{"source":..., "raw_payload": {...}}, ...] → 統一 DataFrame。"""
    rate = settings.usd_twd_rate if rate is None else rate
    if not raw_records:
        return pd.DataFrame(columns=UNIFIED_COLUMNS)

    normalized = []
    for rec in raw_records:
        source = rec.get("source")
        normalizer = _NORMALIZERS.get(source)
        if normalizer is None:
            logger.warning("未知來源,略過:%s", source)
            continue
        normalized.append(normalizer(rec.get("raw_payload", {}), rate))

    df = pd.DataFrame(normalized, columns=UNIFIED_COLUMNS)

    # 缺值處理:數值欄缺值補 0、型別轉換
    for col in NUMERIC_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    df[["impressions", "clicks", "conversions"]] = (
        df[["impressions", "clicks", "conversions"]].astype(int)
    )
    df[["cost_twd", "revenue_twd"]] = df[["cost_twd", "revenue_twd"]].round(2)

    # 丟棄無法辨識活動名或日期的列
    df = df.dropna(subset=["campaign_name", "date"])
    df["date"] = df["date"].dt.date

    return df.reset_index(drop=True)
