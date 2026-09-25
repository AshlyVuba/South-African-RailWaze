from app.middleware.error_handler import (
    generic_exception_handler,
    http_exception_handler,
    rate_limit_handler,
    validation_exception_handler,
)
from app.routers import passport, trivia, waypoints
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="RailWaze API",
    description="Offline-First & Security Architecture API for RailWaze",
    version="0.1.0",
)

# Register SlowAPI state and custom rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Register custom global exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Scoped CORS for RailWaze frontend applications
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
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Session-ID"],
)

app.include_router(waypoints.router)
app.include_router(passport.router)
app.include_router(trivia.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
