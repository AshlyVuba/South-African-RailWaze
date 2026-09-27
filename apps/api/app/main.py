import os

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.error_handler import (
    generic_exception_handler,
    http_exception_handler,
    rate_limit_handler,
    validation_exception_handler,
)
from app.rate_limit import limiter
from app.routers import passport, trivia, waypoints

app = FastAPI(
    title="RailWaze API",
    description="Offline-First & Security Architecture API for RailWaze",
    version="0.1.0",
)

# Register SlowAPI state and rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Register custom global exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Configure CORS.
# The API is stateless (no cookies, no Authorization header consumed by any
# route), so allow_credentials is intentionally left False. Combining
# allow_origins=["*"] with allow_credentials=True is also invalid per the
# Fetch/CORS spec (browsers refuse to honour it), so that pairing must never
# come back even if credentialed endpoints are added later - add explicit
# origins to ALLOWED_ORIGINS instead of re-widening this.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(waypoints.router)
app.include_router(trivia.router)
app.include_router(passport.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}