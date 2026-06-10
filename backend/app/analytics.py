"""分析層:KPI 計算(R3 分母為零全防護)。

ROAS = revenue/cost、CPA = cost/conversions、CTR = clicks/impressions、
預算佔比 = 來源 cost / 總 cost。任一分母為 0 → 回 None,不拋錯。
純函式 compute_kpis 便於測試(D7)。
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import UnifiedCampaign

_METRICS = ["impressions", "clicks", "cost_twd", "conversions", "revenue_twd"]


def _safe_div(numerator: float, denominator: float) -> float | None:
    if not denominator:
        return None
    return numerator / denominator


def _kpi_block(agg: dict, total_cost: float) -> dict:
    cost = agg["cost_twd"]
    return {
        "impressions": int(agg["impressions"]),
        "clicks": int(agg["clicks"]),
        "cost_twd": round(cost, 2),
        "conversions": int(agg["conversions"]),
        "revenue_twd": round(agg["revenue_twd"], 2),
        "roas": _round(_safe_div(agg["revenue_twd"], cost)),                 # cost=0 → None
        "cpa": _round(_safe_div(cost, agg["conversions"])),                  # conv=0 → None
        "ctr": _round(_safe_div(agg["clicks"], agg["impressions"]), 4),      # imp=0 → None
        "budget_share": _round(_safe_div(cost, total_cost), 4),             # 總cost=0 → None
    }


def _round(value: float | None, ndigits: int = 2) -> float | None:
    return None if value is None else round(value, ndigits)


def compute_kpis(records: list[dict]) -> dict:
    """records: 含 _METRICS 與 source 的列 → {overall, by_source}。"""
    overall = {m: 0.0 for m in _METRICS}
    per_source: dict[str, dict] = defaultdict(lambda: {m: 0.0 for m in _METRICS})

    for r in records:
        src = r["source"]
        for m in _METRICS:
            val = float(r[m] or 0)
            overall[m] += val
            per_source[src][m] += val

    total_cost = overall["cost_twd"]
    by_source = [
        {"source": src, **_kpi_block(agg, total_cost)}
        for src, agg in sorted(per_source.items())
    ]
    return {"overall": _kpi_block(overall, total_cost), "by_source": by_source}


def compute_summary(
    db: Session,
    end_date: date_type | None = None,
    days: int | None = None,
) -> dict:
    """由 unified_campaigns 計算整體 KPI 摘要。

    end_date:只看該日(含)以前。
    days:只看「最新資料日(≤ end_date)往回 days 天」的視窗(與趨勢圖的最近 N 天對齊)。
    """
    q = db.query(
        UnifiedCampaign.source,
        UnifiedCampaign.impressions,
        UnifiedCampaign.clicks,
        UnifiedCampaign.cost_twd,
        UnifiedCampaign.conversions,
        UnifiedCampaign.revenue_twd,
    )
    if days:
        max_q = db.query(func.max(UnifiedCampaign.date))
        if end_date:
            max_q = max_q.filter(UnifiedCampaign.date <= end_date)
        max_date = max_q.scalar()
        if max_date is None:
            return compute_kpis([])  # 無資料
        start = max_date - timedelta(days=days - 1)
        q = q.filter(UnifiedCampaign.date >= start, UnifiedCampaign.date <= max_date)
    elif end_date:
        q = q.filter(UnifiedCampaign.date <= end_date)
    rows = q.all()
    records = [
        {
            "source": r.source,
            "impressions": r.impressions,
            "clicks": r.clicks,
            "cost_twd": float(r.cost_twd),
            "conversions": r.conversions,
            "revenue_twd": float(r.revenue_twd),
        }
        for r in rows
    ]
    return compute_kpis(records)


def compute_timeseries(db: Session, end_date: date_type | None = None) -> list[dict]:
    """每日彙總(date 維度):供趨勢圖呈現;end_date 可只看該日(含)以前。"""
    q = db.query(
        UnifiedCampaign.date,
        func.sum(UnifiedCampaign.cost_twd),
        func.sum(UnifiedCampaign.revenue_twd),
        func.sum(UnifiedCampaign.conversions),
    )
    if end_date:
        q = q.filter(UnifiedCampaign.date <= end_date)
    rows = q.group_by(UnifiedCampaign.date).order_by(UnifiedCampaign.date).all()
    out = []
    for d, cost, rev, conv in rows:
        cost = float(cost or 0)
        rev = float(rev or 0)
        out.append({
            "date": d,
            "cost_twd": round(cost, 2),
            "revenue_twd": round(rev, 2),
            "roas": round(rev / cost, 2) if cost else None,
            "conversions": int(conv or 0),
        })
    return out


def _window_by_source(db: Session, start: date_type, end: date_type) -> dict[str, dict]:
    """取指定日期區間各來源彙總,回傳 {source: kpi_block}。重用 compute_kpis。"""
    q = db.query(
        UnifiedCampaign.source,
        UnifiedCampaign.impressions,
        UnifiedCampaign.clicks,
        UnifiedCampaign.cost_twd,
        UnifiedCampaign.conversions,
        UnifiedCampaign.revenue_twd,
    ).filter(UnifiedCampaign.date >= start, UnifiedCampaign.date <= end)
    rows = q.all()
    records = [
        {
            "source": r.source,
            "impressions": r.impressions,
            "clicks": r.clicks,
            "cost_twd": float(r.cost_twd),
            "conversions": r.conversions,
            "revenue_twd": float(r.revenue_twd),
        }
        for r in rows
    ]
    result = compute_kpis(records)
    return {item["source"]: item for item in result["by_source"]}


def compute_insight_summary(db: Session) -> dict:
    """洞察專用彙總(不動 compute_summary):以 max_date 為錨點,算近30/前30兩視窗。

    每來源輸出:
      current       近30天 KPI(roas/cpa/ctr/cost_twd/revenue_twd/conversions/budget_share)
      revenue_share 近30天營收佔比
      efficiency_gap revenue_share - budget_share(正=多賺少花,負=多花少賺)
      prior         前30天 KPI(可為 null)
      delta_pct     {roas/cost_twd/revenue_twd/conversions} 百分比變化(prior=null 時各為 null)
    """
    max_date = db.query(func.max(UnifiedCampaign.date)).scalar()
    if max_date is None:
        return {"by_source": [], "max_date": None}

    from datetime import timedelta
    cur_start = max_date - timedelta(days=29)
    cur_end = max_date
    pri_start = max_date - timedelta(days=59)
    pri_end = max_date - timedelta(days=30)

    cur_map = _window_by_source(db, cur_start, cur_end)
    pri_map = _window_by_source(db, pri_start, pri_end)

    # 近30天總營收,算 revenue_share 用
    total_revenue = sum(v["revenue_twd"] for v in cur_map.values())

    _DELTA_FIELDS = ("roas", "cost_twd", "revenue_twd", "conversions")

    by_source = []
    for source in sorted(cur_map):
        cur = cur_map[source]
        pri = pri_map.get(source)

        # revenue_share / efficiency_gap
        rev_share = _round(_safe_div(cur["revenue_twd"], total_revenue), 4) if total_revenue else None
        eff_gap = _round((rev_share - cur["budget_share"]), 4) if (
            rev_share is not None and cur["budget_share"] is not None
        ) else None

        # delta_pct:前期無花費(cost=0 / 無記錄)視為 prior=null
        prior_valid = pri is not None and (pri.get("cost_twd") or 0) > 0
        delta_pct: dict = {}
        for f in _DELTA_FIELDS:
            if not prior_valid or pri.get(f) is None:
                delta_pct[f] = None
            else:
                prev_val = float(pri[f])
                if prev_val == 0:
                    delta_pct[f] = None
                else:
                    delta_pct[f] = _round((float(cur.get(f) or 0) - prev_val) / prev_val * 100)

        by_source.append({
            "source": source,
            "current": cur,
            "revenue_share": rev_share,
            "efficiency_gap": eff_gap,
            "prior": pri if prior_valid else None,
            "delta_pct": delta_pct,
        })

    return {"by_source": by_source, "max_date": str(max_date)}


def compute_timeseries_by_source(db: Session, end_date: date_type | None = None) -> list[dict]:
    """每日 × 各來源彙總(花費/收入/ROAS):供各來源每日 ROAS 折線圖。"""
    q = db.query(
        UnifiedCampaign.date,
        UnifiedCampaign.source,
        func.sum(UnifiedCampaign.cost_twd),
        func.sum(UnifiedCampaign.revenue_twd),
    )
    if end_date:
        q = q.filter(UnifiedCampaign.date <= end_date)
    rows = (
        q.group_by(UnifiedCampaign.date, UnifiedCampaign.source)
        .order_by(UnifiedCampaign.date, UnifiedCampaign.source)
        .all()
    )
    out = []
    for d, source, cost, rev in rows:
        cost = float(cost or 0)
        rev = float(rev or 0)
        out.append({
            "date": d,
            "source": source,
            "cost_twd": round(cost, 2),
            "revenue_twd": round(rev, 2),
            "roas": round(rev / cost, 2) if cost else None,
        })
    return out
