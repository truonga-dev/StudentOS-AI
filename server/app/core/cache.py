from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def init_cache():
    if settings.redis_url:
        try:
            redis = aioredis.from_url(settings.redis_url)
            FastAPICache.init(RedisBackend(redis), prefix="student-os-cache")
            logger.info("Initialized Redis cache")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}. Falling back to InMemoryBackend.")
            FastAPICache.init(InMemoryBackend(), prefix="student-os-cache")
    else:
        FastAPICache.init(InMemoryBackend(), prefix="student-os-cache")
        logger.info("Initialized InMemory cache")
