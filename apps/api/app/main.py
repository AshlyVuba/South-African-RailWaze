from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.error_handler import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.rate_limit import limiter
from app.routers import waypoints

app = FastAPI(
    title="RailWaze API",
    description="Offline-First & Security Architecture API for RailWaze",
    version="0.1.0",
)

# Register SlowAPI state and rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register custom global exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Required so slowapi injects X-RateLimit-* / Retry-After headers and so
# any future `default_limits=[...]` on the shared limiter actually apply.
app.add_middleware(SlowAPIMiddleware)

app.include_router(waypoints.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}