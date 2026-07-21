# Production readiness and governed workflow

## Supported narrow workflow

The supported surface is **Review response release** at `/api/governed-review-responses`. It provides tenant- and subject-scoped cases, opaque evidence digests, deterministic assessments, optimistic state transitions, dual control, immutable event history, and connector-failure receipts.

Every request after authentication requires:

- `X-Tenant-Id`
- `Idempotency-Key` for mutations
- an active row in `governed_tenant_memberships`
- a subject reference within that membership's prefix

The policy endpoint reports declared connectors as unconfigured. No review platform, CRM, model, translation, publishing, messaging, or analytics connector is configured or validated by this change.

## Deliberate fail-closed boundaries

- Deterministic assessment always returns `automatedDecision: false`, `requiresHumanReview: true`, and a null consequential command.
- Raw personal, financial, safety, or media content is rejected. Store it only in an approved encrypted system and submit an opaque reference, version, timestamp, and SHA-256 digest.
- Legacy generated, AI, and gap routes are unloaded and return 503 unless explicitly enabled for non-production evaluation. Production rejects that flag.
- Startup does not create, alter, seed, or migrate a database. Legacy schema bootstrap is off and prohibited in production.
- Connector failure receipts are durable and tenant scoped; they do not retry or invoke a provider.
- Membership grants, connector credentials, retention schedules, incident handling, and professional review remain deployment responsibilities.

## Reviewed deployment sequence

1. Create a secret of at least 32 random characters and set `JWT_SECRET`; set an explicit `CORS_ORIGINS` allowlist.
2. Review `backend/migrations/001_governed_review_response.sql` and apply it manually in a controlled change window:
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/001_governed_review_response.sql`
3. Provision least-privilege `governed_tenant_memberships` rows through an approved administrative process. Never accept tenant or privileged role grants from public registration.
4. Install locked dependencies explicitly in `backend` and `frontend`; review vulnerabilities and licenses.
5. Run `node --test backend/src/governance/*.test.cjs`, syntax checks, and `bash -n start.sh`.
6. Contract-test each connector in a non-production tenant, including timeouts, duplicates, retries, stale versions, partial failures, reconciliation, revocation, and deletion.
7. Keep `ENABLE_LEGACY_PROVIDER_ROUTES=false` and `ENABLE_LEGACY_SCHEMA_BOOTSTRAP=false` in production.
8. Start with `./start.sh`. It only starts already-installed processes and uses graceful cleanup.

## Rollback and recovery

The migration is additive. Do not delete immutable case, evidence, or event history. Application rollback consists of stopping the new binary and restoring the prior application release; preserve the governed tables for audit and reconciliation. Record connector outages through `/api/governed-review-responses/connector-failures`, correct upstream data in its authoritative system, attach a new versioned receipt, and use an allowed recovery/correction/rollback transition.

No database migration, build, provider call, external service, or end-to-end environment was executed as part of this remediation.
