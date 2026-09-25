from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
=======
from slowapi.errors import RateLimitExceeded
>>>>>>> f9c814919eb2adee5e37001e0a1178f46ddb540a
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.error_handler import (
    generic_exception_handler,
    http_exception_handler,
    rate_limit_handler,
    validation_exception_handler,
)
<<<<<<< HEAD
from app.routers import passport, trivia, waypoints

limiter = Limiter(key_func=get_remote_address)
=======
from app.rate_limit import limiter
from app.routers import passport, trivia, waypoints
>>>>>>> f9c814919eb2adee5e37001e0a1178f46ddb540a

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(waypoints.router)
app.include_router(trivia.router)
app.include_router(passport.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}