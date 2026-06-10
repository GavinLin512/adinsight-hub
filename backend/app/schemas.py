"""Pydantic 回應模型。"""
from __future__ import annotations

from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    campaign_name: str
    date: date_type
    impressions: int
    clicks: int
    cost_twd: float
    conversions: int
    revenue_twd: float


class KpiBlock(BaseModel):
    impressions: int
    clicks: int
    cost_twd: float
    conversions: int
    revenue_twd: float
    roas: float | None
    cpa: float | None
    ctr: float | None
    budget_share: float | None


class SourceKpi(KpiBlock):
    source: str


class AnalyticsSummary(BaseModel):
    overall: KpiBlock
    by_source: list[SourceKpi]


class InsightItem(BaseModel):
    source: str
    action: str       # 加 / 減 / 維持
    reason: str


class InsightMetric(BaseModel):
    """洞察視窗(近 30 天)各來源的確定性數字,供前端策略圖表使用。"""
    source: str
    efficiency_gap: float | None = None   # 營收佔比 − 預算佔比(正=該加、負=該減)
    revenue_share: float | None = None
    budget_share: float | None = None
    roas_delta_pct: float | None = None   # ROAS 近 30 vs 前 30 變化%


class InsightOut(BaseModel):
    generated_at: datetime | None = None
    data_date: date_type | None = None  # 洞察彙總視窗的資料錨點(max unified.date),非牆鐘時間
    summary: str | None = None          # 整體策略摘要(LLM 綜合三來源)
    items: list[InsightItem] = []
    metrics: list[InsightMetric] = []   # 各來源效率落差/前期變化(確定性,與 LLM 成敗無關)
    raw_text: str | None = None
    error: str | None = None


class TimeseriesPoint(BaseModel):
    date: date_type
    cost_twd: float
    revenue_twd: float
    roas: float | None
    conversions: int


class SourceTimeseriesPoint(BaseModel):
    date: date_type
    source: str
    cost_twd: float
    revenue_twd: float
    roas: float | None


class EtlRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: str
    status: str          # ok / partial / failed
    summary: dict
    created_at: datetime
