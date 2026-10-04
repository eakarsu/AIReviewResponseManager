const { validatePolicy, suggestGroundedDraft, sha256 } = require('./groundedDraft');
const { createReplyModelAdapter } = require('./replyModelAdapter');

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function fail(res, error) {
  if (error.code === '23505') return res.status(409).json({ error: 'POLICY_VERSION_OR_KEY_EXISTS' });
  return res.status(error.status || 500).json({
    error: error.code || 'GROUNDED_DRAFT_FAILURE',
    message: error.status ? error.message : 'The grounded draft request could not complete.',
  });
}

function reject(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  throw error;
}

function requestContext(req, mutation = false) {
  const tenantId = String(req.headers['x-tenant-id'] || '');
  const actorId = String(req.user?.id || '');
  const role = String(req.user?.role || '');
  const idempotencyKey = String(req.headers['idempotency-key'] || '');
  if (!ID.test(tenantId) || !ID.test(actorId) || !ID.test(role)) {
    reject('AUTH_CONTEXT_INVALID', 'Valid tenant membership is required.', 401);
  }
  if (mutation && !ID.test(idempotencyKey)) {
    reject('IDEMPOTENCY_REQUIRED', 'A valid Idempotency-Key is required.', 400);
  }
  return { tenantId, actorId, role, idempotencyKey, scope: String(req.governanceScope || '') };
}

function policyDigest(businessId, version, policy) {
  return sha256({ businessId: String(businessId), version, ...policy });
}

function createGroundedDraftRouter({ express, db, modelAdapter = createReplyModelAdapter() }) {
  const router = express.Router();

  router.get('/draft-provider-status', (req, res) => {
    try {
      const ctx = requestContext(req);
      return res.json({ ...modelAdapter.status(ctx.tenantId), reviewPlatformVerified: false, publishingConfigured: false });
    } catch (error) { return fail(res, error); }
  });

  // The parent governed router has already authenticated the actor and loaded their tenant scope.
  router.get('/business-policies', async (req, res) => {
    try {
      const ctx = requestContext(req);
      if (ctx.role !== 'business_owner' || ctx.scope !== '*') {
        return res.status(403).json({ error: 'BUSINESS_OWNER_REQUIRED' });
      }
      const rows = await db.query(
        `SELECT p.id, p.business_id, b.name AS business_name, p.version, p.voice,
                p.closing, p.allowed_topics, p.sha256, p.approved_by, p.approved_at
         FROM governed_business_policies p
         JOIN businesses b ON b.id=p.business_id AND b.user_id=$2
         WHERE p.tenant_id=$1 ORDER BY p.approved_at DESC LIMIT 100`,
        [ctx.tenantId, ctx.actorId]
      );
      res.json(rows);
    } catch (error) { fail(res, error); }
  });

  router.post('/business-policies', async (req, res) => {
    try {
      const ctx = requestContext(req, true);
      if (ctx.role !== 'business_owner' || ctx.scope !== '*') {
        return res.status(403).json({ error: 'BUSINESS_OWNER_REQUIRED' });
      }
      const businessId = Number(req.body?.businessId);
      const version = String(req.body?.version || '');
      if (!Number.isSafeInteger(businessId) || businessId < 1 || !ID.test(version)) {
        return res.status(400).json({ error: 'BUSINESS_OR_VERSION_INVALID' });
      }
      let policy;
      try { policy = validatePolicy(req.body); }
      catch (error) { return res.status(400).json({ error: 'POLICY_INVALID', message: error.message }); }
      const owner = await db.query('SELECT id FROM businesses WHERE id=$1 AND user_id=$2', [businessId, ctx.actorId]);
      if (!owner[0]) return res.status(403).json({ error: 'BUSINESS_OWNERSHIP_REQUIRED' });
      const digest = policyDigest(businessId, version, policy);
      const inserted = await db.query(
        `INSERT INTO governed_business_policies
          (tenant_id, business_id, version, voice, closing, allowed_topics, sha256, approved_by, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
         ON CONFLICT DO NOTHING
         RETURNING id, business_id, version, voice, closing, allowed_topics, sha256, approved_by, approved_at`,
        [ctx.tenantId, businessId, version, policy.voice, policy.closing,
          JSON.stringify(policy.allowedTopics), digest, ctx.actorId, ctx.idempotencyKey]
      );
      if (inserted[0]) return res.status(201).json(inserted[0]);
      const prior = await db.query(
        `SELECT id, business_id, version, voice, closing, allowed_topics, sha256, approved_by, approved_at
         FROM governed_business_policies WHERE tenant_id=$1 AND idempotency_key=$2`,
        [ctx.tenantId, ctx.idempotencyKey]
      );
      if (!prior[0] || Number(prior[0].business_id) !== businessId || prior[0].version !== version ||
          prior[0].sha256 !== digest || prior[0].approved_by !== ctx.actorId) {
        return res.status(409).json({ error: 'POLICY_VERSION_OR_KEY_EXISTS' });
      }
      return res.json({ ...prior[0], idempotentReplay: true });
    } catch (error) { fail(res, error); }
  });

  router.post('/cases/:id/draft-suggestion', async (req, res) => {
    try {
      const ctx = requestContext(req, true);
      const mode = String(req.body?.mode || 'local');
      if (!['local', 'model'].includes(mode)) return res.status(400).json({ error: 'DRAFT_MODE_INVALID' });
      if (!['response_manager', 'business_owner', 'quality_reviewer', 'privacy_reviewer'].includes(ctx.role)) {
        return res.status(403).json({ error: 'ROLE_CANNOT_SUGGEST' });
      }
      if (!UUID.test(String(req.params.id || ''))) return res.status(400).json({ error: 'CASE_ID_INVALID' });
      const cases = await db.query(
        `SELECT id, subject_ref, policy_version, state FROM governed_cases
         WHERE id=$1 AND tenant_id=$2 AND ($3='*' OR left(subject_ref,char_length($3))=$3)`,
        [req.params.id, ctx.tenantId, ctx.scope]
      );
      const item = cases[0];
      if (!item) return res.status(404).json({ error: 'CASE_NOT_FOUND' });
      const match = /^review:([1-9][0-9]*)$/.exec(item.subject_ref);
      if (!match || !Number.isSafeInteger(Number(match[1]))) {
        return res.status(409).json({ error: 'SAVED_REVIEW_REFERENCE_REQUIRED', message: 'Case subject must be review:<saved numeric review ID>.' });
      }
      const reviews = await db.query(
        `SELECT r.id, r.business_id, r.rating, r.review_text, r.updated_at,
                r.platform, b.name AS business_name, b.user_id AS business_owner_id
         FROM reviews r JOIN businesses b ON b.id=r.business_id WHERE r.id=$1`,
        [Number(match[1])]
      );
      const review = reviews[0];
      if (!review) return res.status(404).json({ error: 'SAVED_REVIEW_NOT_FOUND' });
      const policies = await db.query(
        `SELECT id, business_id, version, voice, closing, allowed_topics, sha256, approved_by, approved_at
         FROM governed_business_policies
         WHERE tenant_id=$1 AND business_id=$2 AND version=$3`,
        [ctx.tenantId, review.business_id, item.policy_version]
      );
      const stored = policies[0];
      if (!stored) return res.status(409).json({ error: 'APPROVED_POLICY_REQUIRED', message: 'The review business owner must approve this policy version first.' });
      if (stored.approved_by !== String(review.business_owner_id)) {
        return res.status(409).json({ error: 'POLICY_OWNER_CHANGED', message: 'Business ownership changed after policy approval. Approve a new policy version.' });
      }
      const policy = {
        ...stored, allowedTopics: stored.allowed_topics,
      };
      if (stored.sha256 !== policyDigest(stored.business_id, stored.version, validatePolicy(policy))) {
        return res.status(409).json({ error: 'POLICY_DIGEST_MISMATCH' });
      }
      const suggestion = suggestGroundedDraft(review, policy);
      if (mode === 'model') {
        if (modelAdapter.status(ctx.tenantId).configuredForTenant) {
          try {
            const generated = await modelAdapter.generate({ tenantId: ctx.tenantId, review, policy, citations: suggestion.citations });
            suggestion.draft = generated.draft;
            suggestion.draftSupport = generated.draftSupport;
            suggestion.claimFlags = [
              ...suggestion.claimFlags.filter(flag => flag.code !== 'draft_contains_consequential_claim'),
              ...generated.claimFlags,
            ];
            suggestion.generation = 'configured_model';
            suggestion.providerStatus.model = 'completed';
          } catch (_) {
            suggestion.generation = 'local_rule_based_fallback';
            suggestion.providerStatus.model = 'failed_fallback';
            suggestion.claimFlags.push({ code: 'model_unavailable_used_local_fallback', source: suggestion.citations[0], detail: 'The configured model did not return a usable draft. This is a local rule-based suggestion.' });
          }
        } else {
          suggestion.generation = 'local_rule_based_fallback';
          suggestion.providerStatus.model = 'not_configured_fallback';
          suggestion.claimFlags.push({ code: 'model_not_configured_used_local_fallback', source: suggestion.citations[0], detail: 'No model is configured for this tenant. This is a local rule-based suggestion.' });
        }
      }
      const evidence = await db.query(
        `SELECT kind, source_ref, source_version, sha256 FROM governed_evidence
         WHERE tenant_id=$1 AND case_id=$2 AND kind IN ('review_snapshot','business_policy')`,
        [ctx.tenantId, item.id]
      );
      const [reviewCitation, policyCitation] = suggestion.citations;
      const reviewAttached = evidence.some(row => row.kind === 'review_snapshot' &&
        row.source_ref === item.subject_ref && row.source_version === reviewCitation.version && row.sha256 === reviewCitation.sha256);
      const policyAttached = evidence.some(row => row.kind === 'business_policy' &&
        row.source_ref === `business-policy:${stored.id}` && row.source_version === stored.version && row.sha256 === policyCitation.sha256);
      if (!reviewAttached) suggestion.claimFlags.push({
        code: 'review_snapshot_not_attached', source: reviewCitation,
        detail: 'Attach the matching saved-review evidence reference before a governed decision.',
      });
      if (!policyAttached) suggestion.claimFlags.push({
        code: 'approved_policy_not_attached', source: policyCitation,
        detail: 'Attach the matching approved-policy evidence reference before a governed decision.',
      });
      return res.json({
        ...suggestion,
        sourceReview: {
          id: review.id, text: review.review_text, rating: review.rating,
          updatedAt: new Date(review.updated_at).toISOString(),
          platformRecordedAs: review.platform,
        },
        business: { id: review.business_id, name: review.business_name },
        policy: { id: stored.id, version: stored.version, voice: stored.voice, approvedAt: stored.approved_at },
        evidenceStatus: { reviewAttached, policyAttached },
        evidenceToRecord: [
          { kind: 'review_snapshot', sourceRef: item.subject_ref, sourceVersion: reviewCitation.version, sha256: reviewCitation.sha256 },
          { kind: 'business_policy', sourceRef: `business-policy:${stored.id}`, sourceVersion: stored.version, sha256: policyCitation.sha256 },
        ],
      });
    } catch (error) { fail(res, error); }
  });

  return router;
}

module.exports = { createGroundedDraftRouter, policyDigest };
