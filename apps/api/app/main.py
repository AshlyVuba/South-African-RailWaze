from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
=======
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
>>>>>>> f44160835c7e493cf325ac0cc5fe778e5b17b200
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.error_handler import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
<<<<<<< HEAD
from app.routers import waypoints

limiter = Limiter(key_func=get_remote_address)
=======
from app.rate_limit import limiter
from app.routers import passport, trivia, waypoints
>>>>>>> f44160835c7e493cf325ac0cc5fe778e5b17b200

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

# Configure CORS (Scoped origins for South-African-RailWaze domain)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Required so slowapi injects X-RateLimit-* / Retry-After headers and so
# any future `default_limits=[...]` on the shared limiter actually apply.
app.add_middleware(SlowAPIMiddleware)

app.include_router(waypoints.router)
app.include_router(trivia.router)
app.include_router(passport.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}