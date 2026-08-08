from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import subjects, tasks, notes, ai, files, gpa

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter
from app.core.cache import init_cache

app = FastAPI(
    title="Student OS AI — Backend API",
    description="REST API cho Student OS AI. Xác thực qua Supabase JWT.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup():
    init_cache()

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        *settings.origins_list
    ] if "*" not in settings.origins_list else ["*"],
    allow_credentials=True if "*" not in settings.origins_list else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(subjects.router, prefix=API_PREFIX)
app.include_router(tasks.router, prefix=API_PREFIX)
app.include_router(notes.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(files.router, prefix=API_PREFIX)
app.include_router(gpa.router, prefix=API_PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": app.version}


# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["system"])
async def root():
    return {
        "name": "Student OS AI API",
        "docs": "/docs",
        "version": app.version,
    }
