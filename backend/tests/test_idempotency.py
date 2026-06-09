"""冪等性測試(D7/D2):mock 數值以日期為種子 → 重跑筆數與數值皆不變。

完整的 DB upsert 冪等於 runtime 里程碑(2.6)驗證;此處驗證其底層保證:
同一天兩次產生 + 清洗的結果完全一致。
"""
from app.etl import mock_sources
from app.etl.transform import transform_batch


def _as_raw(source, rows):
    return [{"source": source, "raw_payload": p} for p in rows]


def test_mock_generation_is_deterministic():
    first = mock_sources.generate_source("google")
    second = mock_sources.generate_source("google")
    assert first == second  # 同一天重跑數值完全一致


def test_transform_output_stable_across_runs():
    rows = mock_sources.generate_source("meta")
    df1 = transform_batch(_as_raw("meta", rows))
    df2 = transform_batch(_as_raw("meta", mock_sources.generate_source("meta")))
    # 筆數不變
    assert len(df1) == len(df2)
    # 數值不變(逐欄比對)
    assert df1.equals(df2)


def test_failure_switch_raises():
    import pytest
    with pytest.raises(mock_sources.SourceFailure):
        mock_sources.generate_source("meta", fail_sources={"meta"})
