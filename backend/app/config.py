"""集中管理環境設定(R4/R5:密鑰與匯率皆走環境變數)。"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DB
    database_url: str = "postgresql+psycopg2://adinsight:adinsight_pw@db:5432/adinsight"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # ETL
    usd_twd_rate: float = 32.0          # R4 固定匯率
    mock_history_days: int = 90         # D5 資料量

    # CORS
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
