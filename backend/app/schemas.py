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


class InsightOut(BaseModel):
    generated_at: datetime | None = None
    data_date: date_type | None = None  # 洞察彙總視窗的資料錨點(max unified.date),非牆鐘時間
    items: list[InsightItem] = []
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
