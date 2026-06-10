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

from app.analytics import compute_insight_summary
from app.config import settings
from app.models import Insight

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """你是一位資深數位行銷分析師。以下是各廣告來源近 30 天(月度策略視窗)的成效彙總(JSON):

{kpi_json}

欄位說明:
- current:近 30 天 KPI(roas=投報率、cost_twd=花費(TWD)、revenue_twd=營收(TWD)、conversions=轉換數、cpa=每次轉換成本、ctr=點擊率、budget_share=預算佔比)
- revenue_share:近 30 天該來源營收佔全部營收的比例
- efficiency_gap:revenue_share − budget_share;正值=多賺少花(效率好,考慮加預算),負值=多花少賺(效率差,考慮減預算)
- prior:前 30 天 KPI(null 代表前期無資料,屬新投放)
- delta_pct:近 30 天相較前 30 天的百分比變化(正=成長、負=下滑;null 代表前期無資料)
  - delta_pct.roas:投報率變化%
  - delta_pct.cost_twd:花費變化%
  - delta_pct.revenue_twd:營收變化%
  - delta_pct.conversions:轉換數變化%

請給出月度預算調整建議。**只輸出 JSON**,格式為一個物件,含「整體建議摘要」與「逐來源建議」兩部分:
{{
  "summary": "<繁體中文,2~3 句的整體策略摘要:綜合三來源的動能與效率落差,給出本月預算的總體方向>",
  "recommendations": [
    {{"source": "<來源>", "action": "<加/減/維持>", "reason": "<繁體中文,一句具體理由>"}}
  ]
}}
規則:
- action 僅能是「加」「減」「維持」三者之一(分別代表 增加/減少/維持預算)。
- 全部用繁體中文。
- summary 須點出「整體 ROAS 走勢」與「該把預算往哪傾斜」,並至少引用一個確定性數字。
- **每條 reason 必須引用至少一個確定性數字**:直接取 delta_pct 的百分比變化或 efficiency_gap 的數值,不得自行重算或捏造數字。
- 若某來源 prior=null(新投放、無前期可比),reason 改寫為說明現況 KPI,不得捏造前期百分比。
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


def _parse_insight(text: str) -> tuple[str, list[dict]]:
    """解析模型輸出為 (整體建議摘要, [{source, action, reason}]);失敗則拋例外(D9 防呆於上層處理)。

    期望物件格式 {"summary": "...", "recommendations": [...]};
    亦相容舊版直接回陣列(此時 summary 為空字串)與各種包裝鍵。
    """
    data = json.loads(_strip_code_fence(text))
    summary = ""
    if isinstance(data, dict):
        summary = str(data.get("summary") or data.get("整體建議") or "")
        # 逐條建議:取第一個為 list 的值,相容 recommendations/items 等包裝鍵
        data = next((v for v in data.values() if isinstance(v, list)), [])
    if not isinstance(data, list):
        raise ValueError("輸出無建議陣列")
    items = []
    for d in data:
        items.append({
            "source": str(d.get("source", "")),
            "action": str(d.get("action", "")),
            "reason": str(d.get("reason", "")),
        })
    return summary, items


# 視為暫時性、值得重試的錯誤訊號(Gemini 高流量 / 限流)
_TRANSIENT_MARKERS = ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded")


def _is_transient(exc: Exception) -> bool:
    # OpenAI SDK 例外帶 status_code(429/503);其餘靠訊息字串比對
    if getattr(exc, "status_code", None) in (429, 503):
        return True
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


def _call_nvidia(prompt: str, retries: int = 3, base_delay: float = 2.0) -> str:
    """NVIDIA NIM 後備(OpenAI 相容 SDK,thinking 模型 gemma-4-31b-it)。

    Gemini 重試耗盡後改打此處;同樣對暫時性錯誤(429/503)指數退避重試。
    - 用官方 openai SDK 指向 NIM base_url;extra_body 開 thinking + reasoning_effort。
    - 推理(reasoning)與最終答案(content)分流;只回 content(即我們要的 JSON)。
    - 不送 response_format(部分 NIM 模型不支援),靠 prompt 指示 + 解析時去除程式碼框。
    """
    from openai import OpenAI

    client = OpenAI(base_url=settings.nvidia_base_url, api_key=settings.nvidia_api_key)
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            completion = client.chat.completions.create(
                model=settings.nvidia_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=1,
                top_p=0.95,
                max_tokens=settings.nvidia_max_tokens,
                extra_body={"chat_template_kwargs": {"enable_thinking": True}},
                stream=False,
            )
            msg = completion.choices[0].message
            reasoning = getattr(msg, "reasoning", None) or getattr(msg, "reasoning_content", None)
            if reasoning:
                logger.info("NVIDIA NIM reasoning(節錄):%s", str(reasoning)[:500])
            return msg.content or ""
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < retries and _is_transient(exc):
                delay = base_delay * (2 ** (attempt - 1))  # 2s, 4s, 8s...
                logger.warning("NVIDIA NIM 暫時性錯誤(第 %s/%s 次),%.0fs 後重試:%s",
                               attempt, retries, delay, exc)
                time.sleep(delay)
                continue
            raise
    raise last_exc  # 理論上不會到這


def _err_brief(exc: Exception) -> str:
    """取例外訊息首行(去除 httpx 等多行雜訊),利於閱讀。"""
    msg = str(exc).strip()
    return msg.splitlines()[0] if msg else exc.__class__.__name__


def _generate_with_fallback(prompt: str) -> str:
    """先試 Gemini(含 3 次重試);失敗則接續 NVIDIA NIM。兩者皆失敗才拋出。"""
    errors: list[str] = []
    if settings.gemini_api_key:
        try:
            return _call_gemini(prompt)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini 失敗,改用 NVIDIA NIM 後備:%s", exc)
            errors.append(f"• Gemini:{_err_brief(exc)}")
    if settings.nvidia_api_key:
        try:
            return _call_nvidia(prompt)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"• NVIDIA NIM:{_err_brief(exc)}")
    # 每家一行,避免兩家訊息擠成一坨難讀
    raise RuntimeError("\n".join(errors) or "無可用的 AI 供應商")


def _build_metrics(ctx: dict) -> list[dict]:
    """從 compute_insight_summary 結果抽出前端圖表要的確定性數字(每來源一筆)。"""
    metrics = []
    for b in ctx.get("by_source", []):
        cur = b.get("current") or {}
        delta = b.get("delta_pct") or {}
        metrics.append({
            "source": b["source"],
            "efficiency_gap": b.get("efficiency_gap"),
            "revenue_share": b.get("revenue_share"),
            "budget_share": cur.get("budget_share"),
            "roas_delta_pct": delta.get("roas"),
        })
    return metrics


def generate_insights(db: Session) -> Insight:
    """產生洞察並存入 DB,回傳該筆 Insight。"""
    ctx = compute_insight_summary(db)
    record = Insight()
    # metrics 為後端確定性算出,與 LLM 成敗無關 → 任何分支都存,前端圖表恆可用
    metrics = _build_metrics(ctx)

    if not settings.gemini_api_key and not settings.nvidia_api_key:
        record.content = {"metrics": metrics}
        record.error = "未設定 GEMINI_API_KEY 或 NVIDIA_API_KEY,略過 AI 洞察產生"
        logger.warning(record.error)
        db.add(record)
        db.commit()
        return record

    prompt = _PROMPT_TEMPLATE.format(kpi_json=json.dumps(ctx, ensure_ascii=False, indent=2))
    try:
        text = _generate_with_fallback(prompt)
    except Exception as exc:  # noqa: BLE001 呼叫失敗一律降級,不可崩潰
        record.content = {"metrics": metrics}
        record.error = f"AI 呼叫失敗(Gemini 與 NVIDIA NIM 皆未成功):\n{exc}"
        logger.error(record.error)
        db.add(record)
        db.commit()
        return record

    try:
        summary_text, items = _parse_insight(text)
        record.content = {"summary": summary_text, "items": items, "metrics": metrics}
    except Exception as exc:  # noqa: BLE001 解析失敗 → 降級保留原文 + 仍存 metrics
        record.content = {"metrics": metrics}
        record.raw_text = text
        record.error = f"AI 回傳非預期格式,已保留原文:{exc}"
        logger.error(record.error)

    db.add(record)
    db.commit()
    return record


def get_latest_insight(db: Session) -> Insight | None:
    return db.query(Insight).order_by(Insight.generated_at.desc(), Insight.id.desc()).first()
