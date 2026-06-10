"""FastAPI 進入點。端點於各群組逐步掛上。"""
import logging
from datetime import date as date_type

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app import schemas
from app.analytics import compute_summary, compute_timeseries, compute_timeseries_by_source
from app.config import settings
from app.db import get_db, wait_for_db
from app.etl.pipeline import run_etl
from app.insights import generate_insights, get_latest_insight
from app.models import EtlRun, RawCampaign, UnifiedCampaign

logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")

app = FastAPI(title="AdInsight Hub API", version="0.1.0")

# R1:允許前端跨來源呼叫
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _on_startup():
    # R2:確保 DB 就緒(entrypoint 已先跑 migration,此處為雙保險)
    wait_for_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/etl/run")
def etl_run(
    fail: str | None = Query(
        default=None,
        description="逗號分隔的來源名稱,模擬該來源擷取失敗(D6,例:?fail=meta)",
    ),
    as_of: date_type | None = Query(
        default=None,
        description="demo 用資料截止日 YYYY-MM-DD,作為 mock 視窗錨點(預設今天)",
    ),
    db: Session = Depends(get_db),
):
    """觸發完整 ETL(extract→transform→load)。"""
    fail_sources = {s.strip() for s in fail.split(",")} if fail else set()
    summary = run_etl(db, fail_sources, as_of)

    # D4:ETL 後產生並快取 AI 洞察。
    # 若本次無資料變更(如全部來源失敗,unified_upserted=0)→ 略過,沿用上一份洞察、省 API。
    if summary["unified_upserted"] == 0:
        summary["insights_status"] = "skipped"
        logger.info("本次無資料變更,略過 AI 洞察產生")
    else:
        try:
            insight = generate_insights(db)
            summary["insights_status"] = "error" if insight.error else "ok"
        except Exception as exc:  # noqa: BLE001
            logger.error("產生洞察時發生未預期錯誤:%s", exc)
            summary["insights_status"] = "error"

    # 持久化本次執行紀錄(供前端紀錄頁查看)
    statuses = [s.get("status") for s in summary["sources"].values()]
    if all(st == "ok" for st in statuses):
        run_status = "ok"
    elif all(st == "failed" for st in statuses):
        run_status = "failed"
    else:
        run_status = "partial"
    db.add(EtlRun(batch_id=summary["batch_id"], status=run_status, summary=summary))
    db.commit()
    summary["run_status"] = run_status

    return summary


@app.get("/etl/runs", response_model=list[schemas.EtlRunOut])
def etl_runs(limit: int = Query(default=50, le=200), db: Session = Depends(get_db)):
    """回傳最近的 ETL 執行紀錄(新到舊)。"""
    return (
        db.query(EtlRun)
        .order_by(EtlRun.created_at.desc(), EtlRun.id.desc())
        .limit(limit)
        .all()
    )


@app.post("/admin/reset-data")
def reset_data(db: Session = Depends(get_db)):
    """清除所有累積資料(raw / unified / insights / etl_runs),保留 schema 與 mock 產生器。"""
    db.execute(text("TRUNCATE raw_campaigns, unified_campaigns, insights, etl_runs RESTART IDENTITY"))
    db.commit()
    logger.info("已清除所有資料表")
    return {"status": "ok", "message": "已清除所有資料"}


@app.get("/raw/overview")
def raw_overview(db: Session = Depends(get_db)):
    """資料孤島 → 統一的對比資料:每來源一筆原始 payload + raw/unified 統計。"""
    samples = {}
    for src in ("google", "meta", "ga4"):
        row = (
            db.query(RawCampaign)
            .filter(RawCampaign.source == src)
            .order_by(RawCampaign.id.desc())
            .first()
        )
        samples[src] = row.raw_payload if row else None

    raw_total = db.query(func.count(RawCampaign.id)).scalar() or 0
    raw_batches = db.query(func.count(func.distinct(RawCampaign.ingestion_batch_id))).scalar() or 0
    raw_by_source = dict(
        db.query(RawCampaign.source, func.count(RawCampaign.id))
        .group_by(RawCampaign.source)
        .all()
    )

    u_total = db.query(func.count(UnifiedCampaign.id)).scalar() or 0
    u_min = db.query(func.min(UnifiedCampaign.date)).scalar()
    u_max = db.query(func.max(UnifiedCampaign.date)).scalar()

    return {
        "sample": samples,
        "raw_stats": {
            "total_rows": raw_total,
            "batch_count": raw_batches,
            "by_source": raw_by_source,
        },
        "unified_stats": {
            "total_rows": u_total,
            "date_min": u_min.isoformat() if u_min else None,
            "date_max": u_max.isoformat() if u_max else None,
        },
    }


@app.get("/campaigns", response_model=list[schemas.CampaignOut])
def list_campaigns(
    source: str | None = Query(default=None, description="來源過濾:google/meta/ga4"),
    date: date_type | None = Query(default=None, description="日期過濾 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """查詢統一後的資料,支援來源與日期過濾。"""
    q = db.query(UnifiedCampaign)
    if source:
        q = q.filter(UnifiedCampaign.source == source)
    if date:
        q = q.filter(UnifiedCampaign.date == date)
    return q.order_by(UnifiedCampaign.date.desc(), UnifiedCampaign.source).all()


@app.get("/analytics/summary", response_model=schemas.AnalyticsSummary)
def analytics_summary(
    end_date: date_type | None = Query(default=None, description="只看此日(含)以前的資料 YYYY-MM-DD"),
    days: int | None = Query(default=None, ge=1, le=365, description="只看最新資料日往回 N 天(與趨勢圖對齊)"),
    db: Session = Depends(get_db),
):
    """回傳整體與分來源的行銷 KPI。"""
    return compute_summary(db, end_date, days)


@app.get("/analytics/timeseries", response_model=list[schemas.TimeseriesPoint])
def analytics_timeseries(
    end_date: date_type | None = Query(default=None, description="只看此日(含)以前的資料 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """每日彙總趨勢(date 維度)。"""
    return compute_timeseries(db, end_date)


@app.get("/analytics/timeseries-by-source", response_model=list[schemas.SourceTimeseriesPoint])
def analytics_timeseries_by_source(
    end_date: date_type | None = Query(default=None, description="只看此日(含)以前的資料 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """每日 × 各來源趨勢(供各來源每日 ROAS 折線圖)。"""
    return compute_timeseries_by_source(db, end_date)


@app.get("/insights", response_model=schemas.InsightOut)
def insights(db: Session = Depends(get_db)):
    """讀取 ETL 後已快取的最新一筆 AI 洞察(不即時呼叫 Gemini)。"""
    record = get_latest_insight(db)
    # 洞察視窗的資料錨點 = 目前 unified 最新資料日(與產生時 compute_summary 的錨點一致)
    data_date = db.query(func.max(UnifiedCampaign.date)).scalar()
    if record is None:
        return schemas.InsightOut(data_date=data_date, error="尚無洞察,請先執行 POST /etl/run")
    items = (record.content or {}).get("items", []) if record.content else []
    return schemas.InsightOut(
        generated_at=record.generated_at,
        data_date=data_date,
        items=items,
        raw_text=record.raw_text,
        error=record.error,
    )
