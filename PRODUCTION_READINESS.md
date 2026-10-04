# Production readiness and governed workflow

## Supported narrow workflow

The supported surface is **Review response release** at `/api/governed-review-responses`. It provides tenant- and subject-scoped cases, opaque evidence digests, deterministic assessments, optimistic state transitions, dual control, immutable event history, and connector-failure receipts.

Every request after authentication requires:

- `X-Tenant-Id`
- `Idempotency-Key` for mutations
- an active row in `governed_tenant_memberships`
- a subject reference within that membership's prefix

The policy endpoint reports declared review-platform and publishing connectors as unconfigured. The separate reply model adapter is optional and tenant bound. It is disabled unless all four `GOVERNED_REPLY_MODEL_*` settings below are present. CRM, translation, messaging, and analytics connectors remain unconfigured.

## Owner-approved reply suggestions

Apply `backend/migrations/002_governed_business_policies.sql` after the governed workflow migration. A business owner can approve an immutable policy version for a saved business. A suggestion uses the exact saved review and the policy version named by the tenant-scoped case. The local rule-based mode is always available. The model mode uses a configured OpenAI-compatible HTTPS chat-completions endpoint only for `GOVERNED_REPLY_MODEL_TENANT_ID`; it sends the saved review text, rating, timestamp, and approved policy content to that endpoint. Before enabling it, review provider privacy terms, retention, data residency, credentials, and the tenant's authority to send review data.

Set `GOVERNED_REPLY_MODEL_TENANT_ID`, `GOVERNED_REPLY_MODEL_URL`, `GOVERNED_REPLY_MODEL_ID`, and `GOVERNED_REPLY_MODEL_KEY` in the private environment. The endpoint must be HTTPS and must not contain URL credentials or a fragment. `/api/governed-review-responses/draft-provider-status` reports tenant readiness without revealing the key. Model calls time out after eight seconds. Missing configuration, provider failure, or invalid output produces an explicitly labeled local rule-based fallback; no model success is claimed. A successful model reply must include exact spans from the saved review, policy field citations, an explicit unsupported-claims list, and the approved sign-off. The server flags consequential language and new numbers, but these checks do not prove the draft is factually supported. The business owner must inspect every statement and the underlying review before use.

Suggestions do not save or publish a reply, and the governed publishing connector remains unavailable. No Google Business Profile delivery is claimed. The optional adapter is separate from `ENABLE_LEGACY_PROVIDER_ROUTES` and does not enable generated legacy routes.

## Deliberate fail-closed boundaries

- Deterministic assessment always returns `automatedDecision: false`, `requiresHumanReview: true`, and a null consequential command.
- Raw personal, financial, safety, or media content is rejected. Store it only in an approved encrypted system and submit an opaque reference, version, timestamp, and SHA-256 digest.
- Legacy generated, AI, and gap routes are unloaded and return 503 unless explicitly enabled for non-production evaluation. Production rejects that flag.
- Startup does not create, alter, seed, or migrate a database. Legacy schema bootstrap is off and prohibited in production.
- Connector failure receipts are durable and tenant scoped; they do not retry or invoke a provider.
- Membership grants, connector credentials, retention schedules, incident handling, and professional review remain deployment responsibilities.

## Reviewed deployment sequence

1. Create a secret of at least 32 random characters and set `JWT_SECRET`; set an explicit `CORS_ORIGINS` allowlist.
2. Review `backend/migrations/001_governed_review_response.sql` and `backend/migrations/002_governed_business_policies.sql`, then apply them in order in a controlled change window:
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/001_governed_review_response.sql`
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/002_governed_business_policies.sql`
3. Provision least-privilege `governed_tenant_memberships` rows through an approved administrative process. Never accept tenant or privileged role grants from public registration.
4. Install locked dependencies explicitly in `backend` and `frontend`; review vulnerabilities and licenses.
5. Run `node --test backend/src/governance/*.test.cjs`, syntax checks, and `bash -n start.sh`.
6. Contract-test each connector in a non-production tenant, including timeouts, duplicates, retries, stale versions, partial failures, reconciliation, revocation, and deletion.
7. Keep `ENABLE_LEGACY_PROVIDER_ROUTES=false` and `ENABLE_LEGACY_SCHEMA_BOOTSTRAP=false` in production.
8. Start with `./start.sh`. It only starts already-installed processes and uses graceful cleanup.

## Rollback and recovery

The migration is additive. Do not delete immutable case, evidence, or event history. Application rollback consists of stopping the new binary and restoring the prior application release; preserve the governed tables for audit and reconciliation. Record connector outages through `/api/governed-review-responses/connector-failures`, correct upstream data in its authoritative system, attach a new versioned receipt, and use an allowed recovery/correction/rollback transition.

This optional adapter can be tested with a mock provider; no live model or review-platform call is needed for readiness checks. Database migration and provider contract testing remain deployment steps.
