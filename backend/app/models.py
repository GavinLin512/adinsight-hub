"""資料模型。

兩層設計(D3):
- raw_campaigns:append-only,保留各來源原始 payload 與每批擷取歷史(bronze 層)。
- unified_campaigns:清洗後統一格式,(source, campaign_name, date) 唯一鍵供冪等 upsert。
另含 insights:快取 ETL 後產生的 AI 洞察(D4)。
"""
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class RawCampaign(Base):
    """原始層:每次擷取整批 append,不去重(D3)。"""

    __tablename__ = "raw_campaigns"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    ingestion_batch_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class UnifiedCampaign(Base):
    """統一層:清洗後資料,冪等 upsert 目標。"""

    __tablename__ = "unified_campaigns"
    __table_args__ = (
        UniqueConstraint("source", "campaign_name", "date", name="uq_unified_src_camp_date"),
        Index("ix_unified_source", "source"),
        Index("ix_unified_date", "date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    campaign_name: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_twd: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    conversions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue_twd: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)


class EtlRun(Base):
    """ETL 執行紀錄:每次 run 的摘要(各來源成功/失敗、洞察狀態),供前端紀錄頁查看。"""

    __tablename__ = "etl_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False)  # ok / partial / failed
    summary: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Insight(Base):
    """快取 AI 洞察(D4):ETL 後產生並存入,GET /insights 直接讀最新一筆。"""

    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # 結構化逐條建議(D9);解析失敗時 content 可為 None,改存 raw_text / error
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
