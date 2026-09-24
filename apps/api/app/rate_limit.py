"""
Single shared slowapi Limiter instance.

Import this everywhere a limiter is needed (main.py, routers) instead of
constructing a new Limiter() in each module. slowapi's @limiter.limit(...)
decorator resolves the *actual* limiter to use from request.app.state.limiter
at request time, so a second, disconnected Limiter() instance elsewhere
doesn't crash anything - but it IS misleading dead state and it silently
diverges if this one ever gets custom storage/default_limits. One instance,
one source of truth.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)