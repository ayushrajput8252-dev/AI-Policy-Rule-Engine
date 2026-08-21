"""Postgres connection for episodic memory (app/memory/episodic_models.py).

Deliberately a separate engine/Base from app/database.py's SQLite engine —
episodic memory is high-write session history, not the policy/rules corpus.
Connects lazily and fails open: if Postgres isn't reachable (e.g. Docker
Desktop isn't running locally), episodic writes are skipped with a warning
instead of crashing the request, matching the fail-open convention already
used for Redis in app/services/cache.py.
"""
import time

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from ..config import settings

EpisodicBase = declarative_base()

_engine = None
_SessionLocal = None
_available = False
_last_check_at = 0.0
RETRY_COOLDOWN_SECONDS = 30


def _init_engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(settings.EPISODIC_DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def episodic_db_available() -> bool:
    """Cheap reachability check. A confirmed-up result is cached for the
    process lifetime (pool_pre_ping handles later drops per-connection); a
    failure is retried after RETRY_COOLDOWN_SECONDS rather than cached
    forever — otherwise a backend started before `docker compose up
    postgres` would stay disabled until restart even once Postgres is
    actually reachable (same fix as services/cache.py's Redis client)."""
    global _available, _last_check_at
    if _available:
        return True
    if (time.monotonic() - _last_check_at) <= RETRY_COOLDOWN_SECONDS:
        return False

    _last_check_at = time.monotonic()
    try:
        engine = _init_engine()
        with engine.connect():
            pass
        from . import episodic_models  # noqa: F401 — ensure models are registered before create_all

        EpisodicBase.metadata.create_all(bind=engine)
        _available = True
    except Exception as e:
        print(f"[Episodic Memory Warning]: Postgres unavailable, episodic writes disabled. ({e})")
        _available = False
    return _available


def get_episodic_session():
    _init_engine()
    return _SessionLocal()
