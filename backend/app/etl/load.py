"""Load:批次冪等 upsert 進 unified_campaigns(D5)。

以 (source, campaign_name, date) 唯一鍵做 ON CONFLICT DO UPDATE。
因數值以日期為種子,重跑既有列數值不變 → 完全冪等。
"""
from __future__ import annotations

import logging

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import UnifiedCampaign

logger = logging.getLogger(__name__)

_UPDATE_COLS = ["impressions", "clicks", "cost_twd", "conversions", "revenue_twd"]
_CHUNK = 1000


def upsert_unified(db: Session, records: list[dict]) -> int:
    """批次 upsert;回傳處理筆數。"""
    if not records:
        return 0

    total = 0
    for start in range(0, len(records), _CHUNK):
        chunk = records[start:start + _CHUNK]
        stmt = insert(UnifiedCampaign).values(chunk)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_unified_src_camp_date",
            set_={col: stmt.excluded[col] for col in _UPDATE_COLS},
        )
        db.execute(stmt)
        total += len(chunk)

    db.commit()
    logger.info("upsert unified: %d 筆", total)
    return total
