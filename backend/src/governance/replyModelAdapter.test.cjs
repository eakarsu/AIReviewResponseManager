const test = require('node:test');
const assert = require('node:assert/strict');
const { configuration, validateModelReply, createReplyModelAdapter } = require('./replyModelAdapter');

const policy = { voice: 'professional', closing: 'Thank you, the team', allowedTopics: ['service'] };
const review = { review_text: 'The service was late.' };
const citations = [{ sha256: 'a'.repeat(64) }, { sha256: 'b'.repeat(64) }];
const valid = {
  draft: 'Thank you for mentioning the service. Thank you, the team',
  reviewSpans: [{ start: 4, end: 11, text: 'service' }],
  policyFields: ['voice', 'closing'], unsupportedClaims: [],
};

test('model configuration is explicit, HTTPS, and bound to one tenant', async () => {
  assert.equal(configuration({ GOVERNED_REPLY_MODEL_URL: 'http://localhost:3001', GOVERNED_REPLY_MODEL_KEY: 'k', GOVERNED_REPLY_MODEL_ID: 'm', GOVERNED_REPLY_MODEL_TENANT_ID: 'tenant-a' }), null);
  const adapter = createReplyModelAdapter({ env: {}, fetchImpl: async () => { throw new Error('must not call'); } });
  assert.equal(adapter.status('tenant-a').configuredForTenant, false);
  await assert.rejects(adapter.generate({ tenantId: 'tenant-a', review, policy, citations }), /not_configured/);
});

test('model output must cite exact saved review spans and approved closing', () => {
  const result = validateModelReply(valid, review, policy, citations);
  assert.equal(result.draftSupport[0].span.text, 'service');
  assert.ok(result.claimFlags.some(flag => flag.code === 'model_draft_requires_owner_check'));
  assert.throws(() => validateModelReply({ ...valid, reviewSpans: [{ start: 4, end: 11, text: 'delivery' }] }, review, policy, citations), /invalid_review_span/);
  assert.throws(() => validateModelReply({ ...valid, draft: 'We promise a refund tomorrow.' }, review, policy, citations), /unapproved_policy_closing/);
  assert.throws(() => validateModelReply({ ...valid, unsupportedClaims: undefined }, review, policy, citations), /invalid_unsupported_claim_flags/);
});
