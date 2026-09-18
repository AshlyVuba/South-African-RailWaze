# AI Collaboration Guardrails — South African RailWaze

Your team is using different AI assistants across different domains (frontend, backend, geospatial, content). Left unmanaged, that's how you end up with three different ideas of what a "waypoint" object looks like by Thursday. These rules exist to keep every AI-generated contribution compatible with everyone else's, without requiring constant human arbitration.

## 1. The contract is law
`contracts/waypoint.schema.json`, `contracts/trivia-passport.schema.json`, and `contracts/api-openapi.yaml` are the single source of truth for data shape. Every AI agent — regardless of which tool or model is generating the code — must:
- Read the relevant contract file **before** generating any code that produces or consumes that data.
- Never invent a new field, rename a field, or change a type to make its own task easier.
- If a contract genuinely needs to change, that's a separate, explicit issue with its own PR. The contract changes first, on its own, with a note in `docs/DECISIONS.md` — then dependent code is updated. An AI should never quietly patch around a contract mismatch in its own module.

## 2. One issue = one branch = one PR
- Branch naming: `iter<N>/<domain>/<short-description>` (e.g. `iter2/earthbender/train-marker-interpolation`).
- Every PR description references its issue number and pastes the issue's Definition of Done as a checklist.
- A PR that doesn't fully satisfy its issue's DoD stays in draft. No partial merges that leave the DoD unchecked "for later."
- No agent works outside the folder(s) its assigned issue touches. If a fix requires touching another domain's folder, that's flagged for a human or handed to that domain's owner as a new issue — not done silently in passing.

## 3. Shared style, decided once
Before Iteration 2 code starts, commit these to the repo root so every AI generates consistent code from the same rules, rather than each agent defaulting to its own style:
- Frontend: one ESLint + Prettier config (naming convention, import order, quote style).
- Backend: one Ruff/Black config, `snake_case` throughout.
- One naming convention for files and components, documented in `docs/CONVENTIONS.md`.
Any AI-generated PR that doesn't pass the shared linter config fails CI (or fails a manual pre-merge check if CI isn't wired up yet) — it doesn't get "close enough" merged in.

## 4. Placeholder content is loud, not silent
AI models are prone to quietly inventing plausible-looking data (a stock photo URL, a made-up trivia fact, a fake historical date) to fill a gap. That's fine as a placeholder — it's dangerous if nobody notices it's fake before demo day.
- Any placeholder value an AI generates must be prefixed or tagged clearly (`PLACEHOLDER_`, a `// TODO: verify` comment, or an entry in `docs/DECISIONS.md`).
- Historical facts, dates, and photo attributions used in the Memory Vault and Audio Capsule content must be traceable to a real source before they ship. An AI-generated "plausible-sounding" historical claim is not acceptable content for a project about cultural preservation.

## 5. No agent merges its own work
A human teammate reviews and approves every PR before it lands on `main`, regardless of which AI produced it. The review checklist is short but non-negotiable:
- [ ] Matches the linked issue's Definition of Done
- [ ] Doesn't modify `contracts/` unless that *is* the issue
- [ ] Passes lint + at least one test for the new code
- [ ] No secrets, API keys, or hardcoded credentials introduced

## 6. Testing bar
No PR merges without:
- Passing the shared linter/formatter
- At least one smoke or unit test covering the new component/endpoint
- For anything touching the map or a UI component, a manual check at a mobile viewport width

## 7. Decision log, not chat history
Non-obvious calls an AI or teammate makes while building — "used turf.js for distance-along-line instead of manual lerp," "Kimberley photo is a placeholder, real archive pending," "loosened rate limit for demo purposes" — go in `docs/DECISIONS.md` as a one-line dated entry. This is what stops five parallel AI sessions from silently re-deciding the same thing five different ways, and it's what a human skimming the repo at 11pm before the pitch actually needs.

## 8. When contracts conflict, the contract wins
If two AI-produced components disagree about a data shape at integration time, the fix is to correct whichever code doesn't match `contracts/` — not to patch the contract to match whatever happened to get built first. If the contract itself is genuinely wrong, that's a deliberate, logged change (see Rule 1), not a side effect of an integration bug.
