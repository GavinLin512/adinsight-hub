"""三個 mock 來源產生器(D1/D2/D6)。

刻意不一致(展現資料孤島):
- 欄位名:Google 用 `campaign`、Meta 用 `ad_set_name`、GA4 用 `session_campaign`
- 日期格式:Google `YYYY-MM-DD`、Meta `DD/MM/YYYY`、GA4 `YYYYMMDD`
- 幣別:Meta 為 USD,其餘為 TWD

確定性(D2):每筆數值以 (source, campaign, date) 為亂數種子 → 同一天重跑數值完全一致。
策略(D1):固定歷史 + 每跑新增當天 = 每次產生「今天往回 N 天」的視窗,
         因種子固定故歷史不變,跨到新一天時自然多一天。
容錯(D6):指定 source 在 fail_sources 時拋出例外,供展示單一來源失敗。
"""
from __future__ import annotations

import hashlib
import random
from datetime import date, timedelta

from app.config import settings

CAMPAIGNS = {
    "google": ["Brand_Search", "Generic_Search", "Shopping_Core", "Display_Remarketing",
               "YouTube_Awareness", "PMax_AllProducts", "Competitor_Terms", "App_Install"],
    "meta": ["Lookalike_Purchase", "Retargeting_DPA", "Prospecting_Video", "Broad_Advantage",
             "Interest_Fashion", "Engaged_Shoppers", "Cart_Abandoners", "Story_Ads"],
    "ga4": ["summer_promo", "newsletter_jun", "organic_brand", "referral_blog",
            "paid_social_mix", "email_winback", "affiliate_deals", "spring_clear"],
}


class SourceFailure(RuntimeError):
    """模擬某來源擷取失敗(D6)。"""


def _seeded_rng(source: str, campaign: str, d: date) -> random.Random:
    key = f"{source}:{campaign}:{d.isoformat()}".encode()
    seed = int(hashlib.sha256(key).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def _date_window(days: int, as_of: date | None = None) -> list[date]:
    anchor = as_of or date.today()  # demo 可指定「資料截止日」作為視窗錨點
    return [anchor - timedelta(days=offset) for offset in range(days)]


def _base_metrics(rng: random.Random) -> dict:
    impressions = rng.randint(2_000, 60_000)
    ctr = rng.uniform(0.005, 0.06)
    clicks = max(1, int(impressions * ctr))
    cvr = rng.uniform(0.01, 0.10)
    conversions = max(0, int(clicks * cvr))
    cpc_twd = rng.uniform(4.0, 35.0)
    cost_twd = round(clicks * cpc_twd, 2)
    aov_twd = rng.uniform(400.0, 1500.0)
    revenue_twd = round(conversions * aov_twd, 2)
    return {
        "impressions": impressions,
        "clicks": clicks,
        "conversions": conversions,
        "cost_twd": cost_twd,
        "revenue_twd": revenue_twd,
    }


def generate_google(days: int, as_of: date | None = None) -> list[dict]:
    """Google Ads 風格:campaign / day(YYYY-MM-DD)/ TWD。"""
    rows = []
    for d in _date_window(days, as_of):
        for camp in CAMPAIGNS["google"]:
            m = _base_metrics(_seeded_rng("google", camp, d))
            rows.append({
                "campaign": camp,
                "day": d.strftime("%Y-%m-%d"),
                "impressions": m["impressions"],
                "clicks": m["clicks"],
                "cost": m["cost_twd"],          # TWD
                "conversions": m["conversions"],
                "conv_value": m["revenue_twd"],  # TWD
            })
    return rows


def generate_meta(days: int, as_of: date | None = None) -> list[dict]:
    """Meta 風格:ad_set_name / date(DD/MM/YYYY)/ USD。"""
    rate = settings.usd_twd_rate
    rows = []
    for d in _date_window(days, as_of):
        for camp in CAMPAIGNS["meta"]:
            m = _base_metrics(_seeded_rng("meta", camp, d))
            rows.append({
                "ad_set_name": camp,
                "date": d.strftime("%d/%m/%Y"),
                "impressions": m["impressions"],
                "link_clicks": m["clicks"],
                "spend": round(m["cost_twd"] / rate, 2),     # USD
                "results": m["conversions"],
                "revenue": round(m["revenue_twd"] / rate, 2),  # USD
            })
    return rows


def generate_ga4(days: int, as_of: date | None = None) -> list[dict]:
    """GA4 風格:session_campaign / event_date(YYYYMMDD)/ TWD,欄位名再不同一套。"""
    rows = []
    for d in _date_window(days, as_of):
        for camp in CAMPAIGNS["ga4"]:
            m = _base_metrics(_seeded_rng("ga4", camp, d))
            rows.append({
                "session_campaign": camp,
                "event_date": d.strftime("%Y%m%d"),
                "ad_impressions": m["impressions"],
                "ad_clicks": m["clicks"],
                "ad_cost": m["cost_twd"],          # TWD
                "conversions": m["conversions"],
                "total_revenue": m["revenue_twd"],  # TWD
            })
    return rows


_GENERATORS = {
    "google": generate_google,
    "meta": generate_meta,
    "ga4": generate_ga4,
}


def generate_source(
    source: str,
    fail_sources: set[str] | None = None,
    as_of: date | None = None,
) -> list[dict]:
    """產生單一來源資料;若於 fail_sources 內則拋 SourceFailure(D6)。

    as_of:demo 用「資料截止日」,作為 mock 視窗錨點(預設今天)。
    """
    fail_sources = fail_sources or set()
    if source in fail_sources:
        raise SourceFailure(f"模擬來源 '{source}' 擷取失敗")
    days = settings.mock_history_days
    return _GENERATORS[source](days, as_of)


ALL_SOURCES = list(_GENERATORS.keys())
