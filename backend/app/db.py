"""SQLAlchemy 連線 / session。

import 時只建立 engine(不連線),避免單元測試在無 DB 時卡住;
DB readiness 的等待重試(R2)由 wait_for_db() 於啟動時呼叫。
"""
import logging
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# create_engine 為惰性,不會立即連線
engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def wait_for_db(retries: int = 10, delay: float = 3.0) -> None:
    """等待 DB 就緒(R2);供啟動時呼叫。"""
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError as exc:  # noqa: PERF203
            last_err = exc
            logger.warning("DB 尚未就緒(第 %s/%s 次),%.1fs 後重試...", attempt, retries, delay)
            time.sleep(delay)
    raise RuntimeError(f"無法連上資料庫:{last_err}")


def get_db():
    """FastAPI 相依注入用的 session 產生器。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
