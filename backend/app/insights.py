"""AI 洞察(D4/D9):ETL 後呼叫 Gemini 產生結構化逐條建議並存入 DB。

- 結構化 JSON、繁體中文輸出(D9)。
- 缺 key / 呼叫失敗 / 非 JSON → 降級存 error 或 raw_text,不崩潰(D9 防呆)。
- GET /insights 直接讀最新一筆(不即時呼叫 Gemini)。
"""
from __future__ import annotations

import json
import logging
import time

from sqlalchemy.orm import Session

from app.analytics import compute_summary
from app.config import settings
from app.models import Insight

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """你是一位資深數位行銷分析師。以下是各廣告來源近 30 天的成效 KPI 彙總(JSON):

{kpi_json}

請依近 30 天數據給出月度預算調整建議。**只輸出 JSON**,格式為物件陣列,每個來源一條:
[
  {{"source": "<來源>", "action": "<加/減/維持>", "reason": "<繁體中文,一句具體理由,引用 ROAS 或 CPA 等數字>"}}
]
規則:
- action 僅能是「加」「減」「維持」三者之一。
- 全部用繁體中文。
- 不要輸出 JSON 以外的任何文字、不要用 markdown 程式碼框。
"""


def _strip_code_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[-1] if "\n" in t else t
        if t.endswith("```"):
            t = t[: -3]
        # 去掉可能殘留的開頭語言標記
        t = t.strip()
        if t.lower().startswith("json"):
            t = t[4:].strip()
    return t


def _parse_items(text: str) -> list[dict]:
    """解析模型輸出為 [{source, action, reason}];失敗則拋例外(D9 防呆於上層處理)。"""
    data = json.loads(_strip_code_fence(text))
    if isinstance(data, dict) and "items" in data:
        data = data["items"]
    if not isinstance(data, list):
        raise ValueError("輸出非陣列")
    items = []
    for d in data:
        items.append({
            "source": str(d.get("source", "")),
            "action": str(d.get("action", "")),
            "reason": str(d.get("reason", "")),
        })
    return items


# 視為暫時性、值得重試的錯誤訊號(Gemini 高流量 / 限流)
_TRANSIENT_MARKERS = ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded")


def _is_transient(exc: Exception) -> bool:
    msg = str(exc)
    return any(marker in msg for marker in _TRANSIENT_MARKERS)


def _call_gemini(prompt: str, retries: int = 3, base_delay: float = 2.0) -> str:
    """實際呼叫 Gemini,回傳文字。延遲 import 讓無 SDK/無 key 時其餘功能不受影響。

    暫時性錯誤(503/429)以指數退避重試 retries 次;其餘錯誤立即拋出。
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            return resp.text or ""
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < retries and _is_transient(exc):
                delay = base_delay * (2 ** (attempt - 1))  # 2s, 4s, 8s...
                logger.warning("Gemini 暫時性錯誤(第 %s/%s 次),%.0fs 後重試:%s",
                               attempt, retries, delay, exc)
                time.sleep(delay)
                continue
            raise
    raise last_exc  # 理論上不會到這(迴圈內已 return/raise)


def generate_insights(db: Session) -> Insight:
    """產生洞察並存入 DB,回傳該筆 Insight。"""
    summary = compute_summary(db, days=30)
    record = Insight()

    if not settings.gemini_api_key:
        record.error = "未設定 GEMINI_API_KEY,略過 AI 洞察產生"
        logger.warning(record.error)
        db.add(record)
        db.commit()
        return record

    prompt = _PROMPT_TEMPLATE.format(kpi_json=json.dumps(summary, ensure_ascii=False, indent=2))
    try:
        text = _call_gemini(prompt)
    except Exception as exc:  # noqa: BLE001 呼叫失敗一律降級,不可崩潰
        record.error = f"Gemini 呼叫失敗:{exc}"
        logger.error(record.error)
        db.add(record)
        db.commit()
        return record

    try:
        items = _parse_items(text)
        record.content = {"items": items}
    except Exception as exc:  # noqa: BLE001 解析失敗 → 降級保留原文
        record.raw_text = text
        record.error = f"AI 回傳非預期格式,已保留原文:{exc}"
        logger.error(record.error)

    db.add(record)
    db.commit()
    return record


def get_latest_insight(db: Session) -> Insight | None:
    return db.query(Insight).order_by(Insight.generated_at.desc(), Insight.id.desc()).first()
