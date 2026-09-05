module.exports = {
  caseType: 'approved_review_response_release',
  initialState: 'review_registered',
  states: ['review_registered','platform_reconciled','ownership_assigned','draft_recorded','quality_review','publication_approved','publish_queued','published','publish_failed','recovered','closed'],
  createRoles: ['response_manager','business_owner'],
  assessmentRoles: ['response_manager','quality_reviewer','privacy_reviewer'],
  auditRoles: ['business_owner','quality_reviewer','privacy_reviewer','auditor'],
  connectorRoles: ['integration_operator','business_owner'],
  evidenceKinds: ['review_platform_receipt','review_snapshot','business_policy','assignment_record','template_version','draft_digest','quality_report','rights_consent_record','privacy_moderation_report','approval_record','publish_receipt','publish_failure','recovery_record','analytics_snapshot'],
  requiredSignals: ['reviewVersion','platformVersion','templateVersion','policyVersion','rightsStatus','consentStatus','privacyStatus','moderationStatus','responseCoverage','qualityScore','slaMinutes'],
  professionalBoundary: 'Generated responses remain drafts. Authorized business, privacy, and quality reviewers approve publication; no platform write occurs from assessment.',
  connectors: [
    { name: 'review_platform', purpose: 'versioned review and publish receipts' },
    { name: 'crm_business', purpose: 'authoritative business ownership and policy versions' },
    { name: 'model_provider', purpose: 'draft-generation receipts only' },
    { name: 'translation', purpose: 'locale and accessibility receipts' },
    { name: 'publishing', purpose: 'signed publish receipts' },
    { name: 'messaging', purpose: 'consented notification receipts' },
    { name: 'analytics', purpose: 'reconciled coverage, SLA, and failure snapshots' },
  ],
  transitions: [
    { from: 'review_registered', action: 'reconcile_platform', to: 'platform_reconciled', roles: ['integration_operator'], requiresEvidence: true },
    { from: 'platform_reconciled', action: 'assign_owner', to: 'ownership_assigned', roles: ['response_manager','business_owner'], requiresEvidence: true },
    { from: 'ownership_assigned', action: 'record_draft', to: 'draft_recorded', roles: ['response_manager'], requiresEvidence: true },
    { from: 'draft_recorded', action: 'submit_quality_review', to: 'quality_review', roles: ['quality_reviewer','privacy_reviewer'], requiresEvidence: true, dualControl: true },
    { from: 'quality_review', action: 'approve_publication', to: 'publication_approved', roles: ['business_owner','privacy_reviewer'], requiresEvidence: true, dualControl: true },
    { from: 'publication_approved', action: 'queue_publish', to: 'publish_queued', roles: ['business_owner'], requiresEvidence: true, dualControl: true },
    { from: 'publish_queued', action: 'record_publish', to: 'published', roles: ['integration_operator'], requiresEvidence: true },
    { from: 'publish_queued', action: 'record_failure', to: 'publish_failed', roles: ['integration_operator'], requiresEvidence: true },
    { from: 'publish_failed', action: 'record_recovery', to: 'recovered', roles: ['integration_operator','response_manager'], requiresEvidence: true },
    { from: 'published', action: 'close_case', to: 'closed', roles: ['response_manager','business_owner'], requiresEvidence: true },
    { from: 'recovered', action: 'close_case', to: 'closed', roles: ['response_manager','business_owner'], requiresEvidence: true },
  ],
  acceptedFixture: { reviewVersion:'rv1',platformVersion:'pv1',templateVersion:'tv1',policyVersion:'p1',rightsStatus:'verified',consentStatus:'verified',privacyStatus:'passed',moderationStatus:'passed',responseCoverage:0.99,qualityScore:0.94,slaMinutes:45 },
  rejectedFixture: { reviewVersion:'rv1',platformVersion:'pv1',templateVersion:'tv1',policyVersion:'p1',rightsStatus:'missing',consentStatus:'verified',privacyStatus:'passed',moderationStatus:'passed',responseCoverage:0.99,qualityScore:0.94,slaMinutes:45 },
  readyDisposition: 'human_publication_review_required',
  holdDisposition: 'coverage_quality_or_rights_hold',
  decisionField: 'publishCommand',
  assess: (x) => {
    const coverage=Number(x.responseCoverage), quality=Number(x.qualityScore), sla=Number(x.slaMinutes);
    const ready=x.rightsStatus==='verified'&&x.consentStatus==='verified'&&x.privacyStatus==='passed'&&x.moderationStatus==='passed'&&Number.isFinite(coverage)&&Number.isFinite(quality)&&Number.isFinite(sla)&&coverage>=0.95&&coverage<=1&&quality>=0.9&&quality<=1&&sla>=0&&sla<=120;
    return { disposition: ready?'human_publication_review_required':'coverage_quality_or_rights_hold', publishCommand:null, metrics:{responseCoverage:coverage,qualityScore:quality,slaMinutes:sla}, versions:{review:x.reviewVersion,platform:x.platformVersion,template:x.templateVersion} };
  },
};
