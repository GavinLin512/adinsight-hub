"""initial schema: raw_campaigns, unified_campaigns, insights

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "raw_campaigns",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ingestion_batch_id", sa.String(length=64), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_raw_campaigns_ingestion_batch_id", "raw_campaigns", ["ingestion_batch_id"])

    op.create_table(
        "unified_campaigns",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("campaign_name", sa.String(length=200), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("impressions", sa.Integer(), nullable=False),
        sa.Column("clicks", sa.Integer(), nullable=False),
        sa.Column("cost_twd", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("conversions", sa.Integer(), nullable=False),
        sa.Column("revenue_twd", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "campaign_name", "date", name="uq_unified_src_camp_date"),
    )
    op.create_index("ix_unified_source", "unified_campaigns", ["source"])
    op.create_index("ix_unified_date", "unified_campaigns", ["date"])

    op.create_table(
        "insights",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("insights")
    op.drop_index("ix_unified_date", table_name="unified_campaigns")
    op.drop_index("ix_unified_source", table_name="unified_campaigns")
    op.drop_table("unified_campaigns")
    op.drop_index("ix_raw_campaigns_ingestion_batch_id", table_name="raw_campaigns")
    op.drop_table("raw_campaigns")
