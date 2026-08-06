from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Bỏ qua các biến .env không khai báo (vd: SUPABASE_JWT_SECRET cũ)
    )

    supabase_url: str
    supabase_service_key: str
    allowed_origins: str = "http://localhost:5173"
    gemini_api_key: str = ""
    groq_api_key: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()  # type: ignore[call-arg]
