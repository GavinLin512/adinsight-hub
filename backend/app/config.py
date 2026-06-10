"""集中管理環境設定(R4/R5:密鑰與匯率皆走環境變數)。"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DB
    database_url: str = "postgresql+psycopg://adinsight:adinsight_pw@db:5432/adinsight"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # NVIDIA NIM(Gemini 重試耗盡後的後備,OpenAI 相容 API)
    nvidia_api_key: str = ""
    nvidia_model: str = "google/gemma-4-31b-it"
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_max_tokens: int = 16384            # thinking 模型需較大上限容納推理

    # ETL
    usd_twd_rate: float = 32.0          # R4 固定匯率
    mock_history_days: int = 90         # D5 資料量

    # CORS
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
