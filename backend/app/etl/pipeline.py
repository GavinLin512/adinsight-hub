"""ETL 編排:extract → transform(只取本批)→ load。"""
from __future__ import annotations

import logging
from datetime import date

from sqlalchemy.orm import Session

from app.etl import extract as extract_mod
from app.etl import load as load_mod
from app.etl import transform as transform_mod

logger = logging.getLogger(__name__)


def run_etl(
    db: Session,
    fail_sources: set[str] | None = None,
    as_of: date | None = None,
) -> dict:
    """執行完整 ETL,回傳摘要(含各來源狀態與 upsert 筆數)。"""
    batch_id, source_report = extract_mod.extract_to_raw(db, fail_sources, as_of)

    raw_records = extract_mod.fetch_batch(db, batch_id)  # 只取本批(最新 batch)
    df = transform_mod.transform_batch(raw_records)
    records = df.to_dict("records")
    upserted = load_mod.upsert_unified(db, records)

    summary = {
        "batch_id": batch_id,
        "as_of": as_of.isoformat() if as_of else None,
        "sources": source_report,
        "transformed_rows": len(records),
        "unified_upserted": upserted,
    }
    logger.info("ETL 完成:%s", summary)
    return summary
