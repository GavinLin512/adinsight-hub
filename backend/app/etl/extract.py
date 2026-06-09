"""Extract:呼叫三 mock 來源,整批寫入 raw_campaigns(append-only)。

每次 run 產生一個 ingestion_batch_id;各來源獨立處理,
單一來源失敗不影響其餘(D6 容錯)。
"""
from __future__ import annotations

import logging
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.etl import mock_sources
from app.models import RawCampaign

logger = logging.getLogger(__name__)


def extract_to_raw(
    db: Session,
    fail_sources: set[str] | None = None,
    as_of: date | None = None,
) -> tuple[str, dict]:
    """回傳 (batch_id, 各來源報告)。"""
    batch_id = uuid.uuid4().hex
    report: dict[str, dict] = {}

    for source in mock_sources.ALL_SOURCES:
        try:
            rows = mock_sources.generate_source(source, fail_sources, as_of)
            db.bulk_save_objects([
                RawCampaign(source=source, raw_payload=payload, ingestion_batch_id=batch_id)
                for payload in rows
            ])
            db.commit()
            report[source] = {"status": "ok", "extracted": len(rows)}
            logger.info("extract %s: %d 筆 (batch=%s)", source, len(rows), batch_id)
        except mock_sources.SourceFailure as exc:
            db.rollback()
            report[source] = {"status": "failed", "error": str(exc)}
            logger.error("extract %s 失敗:%s", source, exc)

    return batch_id, report


def fetch_batch(db: Session, batch_id: str) -> list[dict]:
    """讀取指定批次的原始資料(供 transform 使用)。"""
    rows = (
        db.query(RawCampaign)
        .filter(RawCampaign.ingestion_batch_id == batch_id)
        .all()
    )
    return [{"source": r.source, "raw_payload": r.raw_payload} for r in rows]
