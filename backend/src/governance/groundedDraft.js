const crypto = require('node:crypto');

const VOICES = new Set(['warm', 'professional', 'direct']);
const CLAIM_WORDS = /\b(refund|reimburse|compensat(?:e|ion)|guarantee|free replacement|legal|medical|personal information)\b/i;

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function validatePolicy(input) {
  const voice = String(input?.voice || '');
  const closing = String(input?.closing || '').trim();
  const topics = input?.allowedTopics;
  if (!VOICES.has(voice)) throw new Error('voice must be warm, professional, or direct');
  if (!closing || closing.length > 120 || /[\r\n<>]/.test(closing) || CLAIM_WORDS.test(closing) || /\b(will|promise)\b/i.test(closing)) {
    throw new Error('closing must be a short, claim-free approved sign-off');
  }
  if (!Array.isArray(topics) || topics.length > 20 ||
      topics.some(topic => !/^[A-Za-z][A-Za-z0-9 -]{1,39}$/.test(topic))) {
    throw new Error('allowedTopics must be up to 20 short, plain topic labels');
  }
  const normalizedTopics = [...new Set(topics.map(topic => topic.trim().toLowerCase()))];
  return { voice, closing, allowedTopics: normalizedTopics };
}

function suggestGroundedDraft(review, policy) {
  const text = String(review.review_text || '');
  const rating = Number(review.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('saved review rating is invalid');
  const reviewedAt = new Date(review.updated_at);
  if (!Number.isFinite(reviewedAt.getTime())) throw new Error('saved review timestamp is invalid');
  const approved = validatePolicy(policy);
  const topic = approved.allowedTopics
    .map(label => ({ label, offset: text.toLowerCase().search(new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')) }))
    .find(item => item.offset >= 0);
  const subject = topic ? ` about ${topic.label}` : '';
  const positive = rating >= 4;
  let opening;
  if (approved.voice === 'warm') {
    opening = positive
      ? `Thanks for sharing your experience${subject}. We're glad you took the time to tell us.`
      : `Thanks for telling us about your experience${subject}. We're sorry it did not meet your expectations.`;
  } else if (approved.voice === 'direct') {
    opening = positive
      ? `Thank you for your feedback${subject}. We appreciate it.`
      : `Thank you for your feedback${subject}. We take your concerns seriously.`;
  } else {
    opening = positive
      ? `Thank you for sharing your feedback${subject}. We appreciate your review.`
      : `Thank you for sharing your feedback${subject}. We appreciate the opportunity to review your concerns.`;
  }
  const followUp = positive ? '' : ' Please contact our team through the usual support channel to discuss the details.';
  const draft = `${opening}${followUp} ${approved.closing}`;
  const reviewDigest = sha256({
    id: String(review.id), rating, text, updatedAt: reviewedAt.toISOString(),
  });
  const policyDigest = sha256({
    businessId: String(policy.business_id), version: String(policy.version), ...approved,
  });
  const reviewCitation = {
    source: 'saved_review', id: String(review.id), version: reviewedAt.toISOString(),
    sha256: reviewDigest, rating, field: 'review_text',
    topicSpan: topic ? { start: topic.offset, end: topic.offset + topic.label.length, text: text.slice(topic.offset, topic.offset + topic.label.length) } : null,
  };
  const policyCitation = {
    source: 'approved_business_policy', id: String(policy.id), version: String(policy.version),
    sha256: policyDigest, approvedBy: String(policy.approved_by || ''),
    approvedAt: policy.approved_at ? new Date(policy.approved_at).toISOString() : null,
  };
  const claimFlags = [];
  if (CLAIM_WORDS.test(text)) claimFlags.push({
    code: 'review_mentions_consequential_claim',
    source: reviewCitation,
    detail: 'The review mentions a refund, remedy, legal, medical, or personal-data matter. Check the facts and avoid public promises.',
  });
  if (CLAIM_WORDS.test(draft)) claimFlags.push({
    code: 'draft_contains_consequential_claim',
    source: policyCitation,
    detail: 'The proposed text contains a consequential claim and requires editing before use.',
  });
  if (rating >= 4 && /\b(bad|poor|terrible|worst|disappoint)/i.test(text)) claimFlags.push({
    code: 'rating_text_tension', source: reviewCitation,
    detail: 'The high rating and negative review wording differ; verify tone with the reviewer context.',
  });
  return {
    draft,
    citations: [reviewCitation, policyCitation],
    draftSupport: [
      { part: 'tone_and_rating', source: 'saved_review', citationSha256: reviewDigest, policySha256: policyDigest },
      ...(topic ? [{ part: 'named_topic', source: 'saved_review', citationSha256: reviewDigest, span: reviewCitation.topicSpan }] : []),
      { part: 'approved_sign_off', source: 'approved_business_policy', citationSha256: policyDigest },
    ],
    claimFlags,
    requiresHumanReview: true,
    platformVerified: false,
    generation: 'local_rule_based',
    providerStatus: { model: 'not_called', reviewPlatform: 'unverified_saved_record', publishing: 'unconfigured' },
  };
}

module.exports = { validatePolicy, suggestGroundedDraft, sha256 };
