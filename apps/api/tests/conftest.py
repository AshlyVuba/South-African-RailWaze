import pytest

from app.rate_limit import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """
    slowapi's default key_func (get_remote_address) resolves to the same
    fixed address for every request made through Starlette's TestClient,
    so every test in this session shares one rate-limit bucket per route
    unless we reset it. Without this, an earlier test's requests to
    /waypoints/*/trivia could silently push a later, unrelated test over
    the limit (or the rate-limit test itself could poison later tests).
    """
    limiter.reset()
    yield
    limiter.reset()