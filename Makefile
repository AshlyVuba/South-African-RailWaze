# South African RailWaze - local CI parity
#
# Mirrors .github/workflows/ci.yml exactly, so `make check` passing
# locally means the CI workflow will pass too. Run from the repo root.

.PHONY: help install-backend install-frontend \
        backend-lint backend-test backend-check \
        frontend-lint frontend-test frontend-check \
        check clean

help:
	@echo "Targets:"
	@echo "  make install-backend    Install backend deps (ruff, pytest, requirements.txt)"
	@echo "  make install-frontend   Install frontend deps (npm ci)"
	@echo "  make backend-lint       Run ruff check (apps/api)"
	@echo "  make backend-test       Run pytest (apps/api)"
	@echo "  make backend-check      backend-lint + backend-test"
	@echo "  make frontend-lint      Run npm run lint (apps/web)"
	@echo "  make frontend-test      Run npm test (apps/web)"
	@echo "  make frontend-check     frontend-lint + frontend-test"
	@echo "  make check              Everything CI runs, backend + frontend"
	@echo "  make clean              Remove __pycache__ / .pytest_cache"
	@echo "  make docker-up          Build and start containers in detached mode"
	@echo "  make docker-down        Stop and remove containers"
	@echo "  make docker-test        Run backend tests inside Docker container"

# --- Setup ------------------------------------------------------------

install-backend:
	cd apps/api && python -m pip install --upgrade pip
	cd apps/api && pip install ruff pytest
	cd apps/api && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

install-frontend:
	cd apps/web && npm ci

# --- Backend (matches the "Backend Lint & Test" CI job) ----------------

backend-lint:
	cd apps/api && ruff check .

backend-test:
	cd apps/api && pytest

backend-check: backend-lint backend-test

# --- Frontend (matches the "Frontend Lint & Test" CI job) ---------------

frontend-lint:
	cd apps/web && npm run lint --if-present

frontend-test:
	cd apps/web && npm test --if-present

frontend-check: frontend-lint frontend-test

# --- Everything ---------------------------------------------------------

check: backend-check frontend-check
	@echo "All CI checks passed locally."

clean:
	find apps/api -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	rm -rf apps/api/.pytest_cache

# --- Docker -------------------------------------------------------------

.PHONY: docker-up docker-down docker-test

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-test:
	docker compose run --rm api pytest tests/

