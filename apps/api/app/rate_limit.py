from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def session_or_ip_key(request: Request) -> str:

    session_id = request.headers.get("X-Session-Id")
    if session_id:
        return f"session:{session_id}"
    return get_remote_address(request)


# session_or_ip_key is set as the Limiter's own default key_func here,
# rather than passed as a per-route `key_func=` override to individual
# @limiter.limit(...) calls. Passing it as a per-call override was
# tested and did NOT take effect - two different X-Session-Id values
# still shared one rate-limit bucket, which only happens if the actual
# key in use was still get_remote_address. Setting it as the Limiter's
# own default is what actually works.
#
# headers_enabled=True is required for slowapi to inject Retry-After /
# X-RateLimit-* headers on 429 responses (via SlowAPIMiddleware in
# main.py) - it defaults to False, and without it a 429 gives the
# client no indication of when to retry (issue #17 DoD item 3).
limiter = Limiter(key_func=session_or_ip_key, headers_enabled=True)
