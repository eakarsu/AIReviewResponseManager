const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { validatePolicy, suggestGroundedDraft } = require('./groundedDraft');
const { createGroundedDraftRouter, policyDigest } = require('./groundedDraftRouter');
const { createReplyModelAdapter } = require('./replyModelAdapter');

const caseId = '11111111-1111-4111-8111-111111111111';
const policyInput = { voice: 'warm', closing: 'Thank you, the team', allowedTopics: ['service', 'delivery'] };
const review = {
  id: 123, business_id: 7, rating: 2,
  review_text: 'I asked about a refund after late service.',
  updated_at: new Date('2026-09-30T12:00:00Z'), platform: 'google',
  business_name: 'Example Shop', business_owner_id: 42,
};

test('suggestion cites the exact saved review and approved policy without a provider claim', () => {
  const approved = { id: 9, business_id: 7, version: 'v1', ...policyInput, approved_by: '42' };
  const result = suggestGroundedDraft(review, approved);
  assert.equal(result.generation, 'local_rule_based');
  assert.equal(result.providerStatus.model, 'not_called');
  assert.equal(result.platformVerified, false);
  assert.equal(result.requiresHumanReview, true);
  assert.match(result.draft, /service/);
  assert.doesNotMatch(result.draft, /refund/i);
  assert.equal(result.citations[0].topicSpan.text, 'service');
  assert.equal(result.citations[1].sha256, policyDigest(7, 'v1', validatePolicy(policyInput)));
  assert.ok(result.claimFlags.some(flag => flag.code === 'review_mentions_consequential_claim'));
  const editedReview = { ...review, review_text: `${review.review_text} More detail.` };
  assert.notEqual(suggestGroundedDraft(editedReview, approved).citations[0].sha256, result.citations[0].sha256);
});

test('policy validation rejects a sign-off that promises a remedy', () => {
  assert.throws(() => validatePolicy({ ...policyInput, closing: 'We will refund you' }), /claim-free/);
  assert.throws(() => validatePolicy({ ...policyInput, allowedTopics: ['<script>'] }), /allowedTopics/);
});

test('governed HTTP route requires owner approval and tenant-scoped case, then returns flagged draft', async () => {
  let storedPolicy;
  let modelFailed = false;
  let modelCalls = 0;
  const modelAdapter = createReplyModelAdapter({
    env: {
      GOVERNED_REPLY_MODEL_TENANT_ID: 'tenant-a', GOVERNED_REPLY_MODEL_ID: 'mock-model',
      GOVERNED_REPLY_MODEL_KEY: 'test-secret', GOVERNED_REPLY_MODEL_URL: 'https://model.example.test/v1/chat/completions',
    },
    fetchImpl: async (_url, options) => {
      modelCalls += 1;
      if (modelFailed) throw new Error('provider unavailable');
      const request = JSON.parse(options.body);
      const supplied = JSON.parse(request.messages[1].content);
      assert.equal(supplied.reviewText, review.review_text);
      assert.equal(supplied.policyVersion, 'v1');
      assert.equal(supplied.closing, policyInput.closing);
      assert.equal(options.headers.Authorization, 'Bearer test-secret');
      const spanStart = review.review_text.indexOf('service');
      return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({
        draft: 'We have resolved the service issue. Thank you, the team',
        reviewSpans: [{ start: spanStart, end: spanStart + 7, text: 'service' }],
        policyFields: ['voice', 'closing'], unsupportedClaims: ['Resolution is not established by the saved review.'],
      }) } }] }) };
    },
  });
  const db = { async query(sql, params) {
    if (sql.includes('SELECT id FROM businesses WHERE')) return params[0] === 7 && params[1] === '42' ? [{ id: 7 }] : [];
    if (sql.includes('INSERT INTO governed_business_policies')) {
      storedPolicy = {
        id: 9, business_id: params[1], version: params[2], voice: params[3],
        closing: params[4], allowed_topics: JSON.parse(params[5]), sha256: params[6],
        approved_by: params[7], approved_at: new Date('2026-10-01T12:00:00Z'),
      };
      return [storedPolicy];
    }
    if (sql.includes('FROM governed_cases')) {
      return params[0] === caseId && params[1] === 'tenant-a' &&
        (params[2] === '*' || 'review:123'.startsWith(params[2]))
        ? [{ id: caseId, subject_ref: 'review:123', policy_version: 'v1', state: 'review_registered' }] : [];
    }
    if (sql.includes('FROM reviews r')) return [review];
    if (sql.includes('FROM governed_business_policies')) {
      return params[0] === 'tenant-a' && params[1] === 7 && params[2] === 'v1' && storedPolicy
        ? [storedPolicy] : [];
    }
    if (sql.includes('FROM governed_evidence')) return [];
    throw new Error(`Unexpected test query: ${sql}`);
  } };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 42, role: req.headers['x-test-role'] || 'response_manager' };
    req.governanceScope = req.headers['x-test-scope'] || '*';
    next();
  });
  app.use('/api/governed-review-responses', createGroundedDraftRouter({ express, db, modelAdapter }));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}/api/governed-review-responses`;
  async function post(path, body, headers = {}) {
    const response = await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'tenant-a',
        'Idempotency-Key': 'request-1', ...headers }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    const ready = await fetch(`${base}/draft-provider-status`, { headers: { 'X-Tenant-Id': 'tenant-a' } });
    assert.equal((await ready.json()).configuredForTenant, true);
    const otherTenantReady = await fetch(`${base}/draft-provider-status`, { headers: { 'X-Tenant-Id': 'tenant-b' } });
    assert.equal((await otherTenantReady.json()).configuredForTenant, false);
    const nonOwner = await post('/business-policies', { businessId: 7, version: 'v1', ...policyInput });
    assert.equal(nonOwner.status, 403);
    const approved = await post('/business-policies', { businessId: 7, version: 'v1', ...policyInput }, { 'X-Test-Role': 'business_owner' });
    assert.equal(approved.status, 201);
    assert.equal(approved.body.sha256, policyDigest(7, 'v1', validatePolicy(policyInput)));
    const suggested = await post(`/cases/${caseId}/draft-suggestion`, {});
    assert.equal(suggested.status, 200);
    assert.equal(suggested.body.sourceReview.text, review.review_text);
    assert.equal(suggested.body.providerStatus.publishing, 'unconfigured');
    assert.equal(suggested.body.evidenceStatus.reviewAttached, false);
    assert.ok(suggested.body.claimFlags.some(flag => flag.code === 'approved_policy_not_attached'));
    const modeled = await post(`/cases/${caseId}/draft-suggestion`, { mode: 'model' });
    assert.equal(modeled.status, 200);
    assert.equal(modeled.body.generation, 'configured_model');
    assert.equal(modeled.body.providerStatus.model, 'completed');
    assert.equal(modeled.body.draftSupport[0].span.text, 'service');
    assert.ok(modeled.body.claimFlags.some(flag => flag.code === 'model_identified_unsupported_claim'));
    assert.ok(modeled.body.claimFlags.some(flag => flag.code === 'consequential_or_operational_claim_in_draft'));
    assert.equal(modeled.body.requiresHumanReview, true);
    assert.equal(modeled.body.providerStatus.publishing, 'unconfigured');
    modelFailed = true;
    const fallback = await post(`/cases/${caseId}/draft-suggestion`, { mode: 'model' });
    assert.equal(fallback.body.generation, 'local_rule_based_fallback');
    assert.equal(fallback.body.providerStatus.model, 'failed_fallback');
    assert.doesNotMatch(fallback.body.draft, /resolved/i);
    const outsideTenant = await post(`/cases/${caseId}/draft-suggestion`, {}, { 'X-Tenant-Id': 'tenant-b' });
    assert.equal(outsideTenant.status, 404);
    assert.equal(modelCalls, 2);
    const outsideScope = await post(`/cases/${caseId}/draft-suggestion`, {}, { 'X-Test-Scope': 'review:999' });
    assert.equal(outsideScope.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
