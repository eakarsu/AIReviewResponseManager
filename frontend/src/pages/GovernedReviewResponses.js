import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import './GovernedReviewResponses.css';

const base = '/governed-review-responses';
const newKey = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const message = (error) => error.response?.data?.message || error.response?.data?.error || error.message;

export default function GovernedReviewResponses() {
  const [tenant, setTenant] = useState(() => localStorage.getItem('governed-review-tenant') || '');
  const [activeTenant, setActiveTenant] = useState(() => localStorage.getItem('governed-review-tenant') || '');
  const [policy, setPolicy] = useState(null);
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [approvedPolicies, setApprovedPolicies] = useState([]);
  const [canApprovePolicy, setCanApprovePolicy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [policyForm, setPolicyForm] = useState({ businessId: '', version: '', voice: 'professional', closing: '', allowedTopics: '' });
  const [draftSuggestion, setDraftSuggestion] = useState(null);
  const [modelStatus, setModelStatus] = useState({ configuredForTenant: false, localFallbackAvailable: true });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [subjectRef, setSubjectRef] = useState('');
  const [policyVersion, setPolicyVersion] = useState('');
  const [evidence, setEvidence] = useState({ kind: '', sourceRef: '', sourceVersion: '', sha256: '', capturedAt: '' });
  const [reason, setReason] = useState('');

  const headers = useCallback((mutation = false) => ({
    'X-Tenant-Id': activeTenant,
    ...(mutation ? { 'Idempotency-Key': newKey() } : {}),
  }), [activeTenant]);

  const load = useCallback(async () => {
    if (!activeTenant) return;
    setError('');
    try {
      const [policyResponse, casesResponse] = await Promise.all([
        api.get(`${base}/policy`, { headers: headers() }),
        api.get(`${base}/cases`, { headers: headers() }),
      ]);
      setPolicy(policyResponse.data);
      setCases(Array.isArray(casesResponse.data) ? casesResponse.data : []);
      localStorage.setItem('governed-review-tenant', activeTenant);
      try {
        const modelResponse = await api.get(`${base}/draft-provider-status`, { headers: headers() });
        setModelStatus(modelResponse.data);
      } catch (_) { setModelStatus({ configuredForTenant: false, localFallbackAvailable: true }); }
      try {
        const approvedResponse = await api.get(`${base}/business-policies`, { headers: headers() });
        setApprovedPolicies(Array.isArray(approvedResponse.data) ? approvedResponse.data : []);
        setCanApprovePolicy(true);
        setPolicyError('');
      } catch (approvedError) {
        setApprovedPolicies([]);
        setCanApprovePolicy(false);
        setPolicyError(approvedError.response?.status === 403 ? '' : message(approvedError));
      }
    } catch (err) {
      setPolicy(null);
      setCases([]);
      setApprovedPolicies([]);
      setCanApprovePolicy(false);
      setModelStatus({ configuredForTenant: false, localFallbackAvailable: true });
      setError(message(err));
    }
  }, [headers, activeTenant]);

  useEffect(() => { load(); }, [load]);

  async function openCase(id) {
    setBusy(true);
    setError('');
    setDraftSuggestion(null);
    try {
      const [caseResponse, historyResponse] = await Promise.all([
        api.get(`${base}/cases/${id}`, { headers: headers() }),
        api.get(`${base}/cases/${id}/history`, { headers: headers() }),
      ]);
      setSelected(caseResponse.data);
      setHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function createCase(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post(`${base}/cases`, {
        subjectRef: subjectRef.trim(), policyVersion: policyVersion.trim(),
        effectiveAt: new Date().toISOString(), sourceSnapshot: {},
      }, { headers: headers(true) });
      setSubjectRef('');
      setNotice('Review case recorded. Add source evidence before advancing it.');
      await load();
      await openCase(response.data.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function addEvidence(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post(`${base}/cases/${selected.id}/evidence`, {
        ...evidence,
        capturedAt: new Date(evidence.capturedAt).toISOString(),
        metadata: {},
      }, { headers: headers(true) });
      setEvidence({ kind: '', sourceRef: '', sourceVersion: '', sha256: '', capturedAt: '' });
      setNotice('Evidence reference recorded. The source file remains in its approved storage.');
      await openCase(selected.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function transition(action) {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post(`${base}/cases/${selected.id}/transitions`, {
        action, expectedVersion: selected.version, reason: reason.trim(),
      }, { headers: headers(true) });
      setReason('');
      setNotice('Decision recorded in the governed history.');
      await load();
      await openCase(selected.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function approvePolicy(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post(`${base}/business-policies`, {
        businessId: Number(policyForm.businessId), version: policyForm.version.trim(),
        voice: policyForm.voice, closing: policyForm.closing.trim(),
        allowedTopics: policyForm.allowedTopics.split(',').map(value => value.trim()).filter(Boolean),
      }, { headers: headers(true) });
      setPolicyForm({ businessId: '', version: '', voice: 'professional', closing: '', allowedTopics: '' });
      setNotice('Business policy version approved and recorded. It remains immutable.');
      await load();
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function suggestReply(mode = 'local') {
    if (!selected) return;
    setBusy(true);
    setError('');
    setDraftSuggestion(null);
    try {
      const response = await api.post(`${base}/cases/${selected.id}/draft-suggestion`, { mode }, { headers: headers(true) });
      setDraftSuggestion(response.data);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  function prepareEvidenceReference(item) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEvidence({ kind: item.kind, sourceRef: item.sourceRef, sourceVersion: item.sourceVersion,
      sha256: item.sha256, capturedAt: local });
    setNotice('Evidence reference copied into the form. Verify the source before recording it.');
  }

  const actions = (policy?.transitions || []).filter(rule => rule.from === selected?.state);
  const connectorActions = new Set(['reconcile_platform', 'queue_publish', 'record_publish', 'record_failure', 'record_recovery']);
  const connectorReady = name => policy?.connectors?.some(connector => connector.name === name && connector.configured);
  const actionReady = action => !connectorActions.has(action) || connectorReady(action === 'reconcile_platform' ? 'review_platform' : 'publishing');

  function selectTenant() {
    setSelected(null);
    setHistory([]);
    setPolicy(null);
    setDraftSuggestion(null);
    setModelStatus({ configuredForTenant: false, localFallbackAvailable: true });
    setApprovedPolicies([]);
    setCanApprovePolicy(false);
    if (activeTenant === tenant.trim()) load();
    else setActiveTenant(tenant.trim());
  }

  return <div className="governed-review">
    <h1>Governed review responses</h1>
    <p>Record opaque review references, source digests, and human decisions. This workflow does not publish replies to a review platform.</p>
    <label>Tenant ID <input value={tenant} onChange={event => setTenant(event.target.value)} placeholder="Provisioned tenant ID" /></label>
    <button type="button" onClick={selectTenant} disabled={!tenant.trim() || busy}>Load workspace</button>
    {error && <p className="governed-error" role="alert">{error}</p>}
    {notice && <p className="governed-notice" role="status">{notice}</p>}
    {!tenant.trim() && <p>Enter the tenant ID assigned to your account to load cases.</p>}
    {policy && <>
      <p className="governed-notice">Platform ingestion and publishing connectors are not configured. Review and approval records here are internal decisions.</p>
      {policyError && <p className="governed-error" role="alert">Approved policy workspace: {policyError}</p>}
      {canApprovePolicy && <section className="governed-policy-workbench">
        <h2>Owner-approved reply policy</h2>
        <p>Only the authenticated owner of the saved business can approve a policy version. Enter its legacy business ID. The approved sign-off and topic labels guide local suggestions.</p>
        <form onSubmit={approvePolicy} className="governed-policy-form">
          <label>Business ID <input required type="number" min="1" value={policyForm.businessId} onChange={event => setPolicyForm({ ...policyForm, businessId: event.target.value })} /></label>
          <label>Version <input required value={policyForm.version} onChange={event => setPolicyForm({ ...policyForm, version: event.target.value })} placeholder="v1" /></label>
          <label>Voice <select value={policyForm.voice} onChange={event => setPolicyForm({ ...policyForm, voice: event.target.value })}><option value="professional">Professional</option><option value="warm">Warm</option><option value="direct">Direct</option></select></label>
          <label>Approved sign-off <input required maxLength="120" value={policyForm.closing} onChange={event => setPolicyForm({ ...policyForm, closing: event.target.value })} placeholder="Thank you, the team" /></label>
          <label>Allowed review topics, comma separated <input value={policyForm.allowedTopics} onChange={event => setPolicyForm({ ...policyForm, allowedTopics: event.target.value })} placeholder="service, appointment, delivery" /></label>
          <button disabled={busy}>Approve policy version</button>
        </form>
        <ul>{approvedPolicies.map(item => <li key={item.id}>{item.business_name} (business {item.business_id}) · {item.version} · {item.voice} · approved {new Date(item.approved_at).toLocaleString()}</li>)}</ul>
        {!approvedPolicies.length && <p>No approved policy versions for your businesses in this tenant.</p>}
      </section>}
      <div className="governed-columns">
        <section>
          <h2>Review cases</h2>
          <form onSubmit={createCase}>
            <label>Opaque review reference <input required value={subjectRef} onChange={event => setSubjectRef(event.target.value)} placeholder="review:123" /></label>
            <label>Policy version <input required value={policyVersion} onChange={event => setPolicyVersion(event.target.value)} placeholder="v1" /></label>
            <button disabled={busy}>Create case</button>
          </form>
          <ul className="governed-list">{cases.map(item => <li key={item.id}><button type="button" onClick={() => openCase(item.id)}><strong>{item.subject_ref}</strong><span>{item.state.replaceAll('_', ' ')} · version {item.version}</span></button></li>)}</ul>
          {!cases.length && <p>No cases in this tenant scope.</p>}
        </section>
        <section>
          <h2>Case review</h2>
          {!selected ? <p>Select a case to inspect its evidence and decisions.</p> : <>
            <p><strong>{selected.subject_ref}</strong> · {selected.state.replaceAll('_', ' ')} · version {selected.version}</p>
            <p>Approved policy version: {selected.policy_version}. A suggestion requires a saved review reference in the form <code>review:123</code> and a matching owner-approved policy version.</p>
            <div className="governed-suggestion">
              <h3>Grounded reply suggestion</h3>
              <p>Both modes use the saved review and the business owner's approved policy. Model output is optional and must be checked by the owner; citation spans prove exact text matches, not factual support. The saved platform record is unverified, and no reply is published.</p>
              <p>Model adapter for this tenant: {modelStatus.configuredForTenant ? 'configured' : 'not configured'}.</p>
              <div className="governed-actions"><button type="button" disabled={busy} onClick={() => suggestReply('local')}>Suggest local rule-based reply</button><button type="button" disabled={busy || !modelStatus.configuredForTenant} onClick={() => suggestReply('model')}>Suggest with configured model</button></div>
              {draftSuggestion && <div className="governed-suggestion-result">
                <p><strong>Generation:</strong> {draftSuggestion.generation === 'configured_model' ? 'Configured model; owner check required' : draftSuggestion.generation === 'local_rule_based_fallback' ? `Local rule-based fallback (${draftSuggestion.providerStatus.model})` : 'Local rule-based suggestion'}.</p>
                <p><strong>Saved review, {draftSuggestion.sourceReview.rating} stars:</strong> {draftSuggestion.sourceReview.text}</p>
                <p>Business: {draftSuggestion.business.name} · recorded platform: {draftSuggestion.sourceReview.platformRecordedAs} (unverified) · saved {new Date(draftSuggestion.sourceReview.updatedAt).toLocaleString()}</p>
                <label>Suggested draft, human review required <textarea readOnly value={draftSuggestion.draft} /></label>
                <p><strong>Claim and evidence checks</strong></p>
                {draftSuggestion.claimFlags.length ? <ul>{draftSuggestion.claimFlags.map(flag => <li key={flag.code}><strong>{flag.code.replaceAll('_', ' ')}</strong>: {flag.detail}</li>)}</ul> : <p>No automatic claim flags. A person must still verify every statement.</p>}
                <p><strong>Citations</strong></p>
                <ul>{draftSuggestion.citations.map(citation => <li key={citation.source}>{citation.source.replaceAll('_', ' ')} {citation.id}, version {citation.version}; SHA-256 <code>{citation.sha256}</code>{citation.topicSpan && <>; review text span {citation.topicSpan.start}–{citation.topicSpan.end}: “{citation.topicSpan.text}”</>}</li>)}</ul>
                <p><strong>Draft support</strong></p>
                <ul>{(draftSuggestion.draftSupport || []).map((support, index) => <li key={`${support.part}-${index}`}>{support.part.replaceAll('_', ' ')}: {support.span ? `saved review characters ${support.span.start}–${support.span.end} “${support.span.text}”` : support.field ? `approved policy field ${support.field}` : support.source.replaceAll('_', ' ')} · citation SHA-256 <code>{support.citationSha256}</code></li>)}</ul>
                <p>Source evidence attached: review {draftSuggestion.evidenceStatus.reviewAttached ? 'yes' : 'no'}; policy {draftSuggestion.evidenceStatus.policyAttached ? 'yes' : 'no'}.</p>
                <div className="governed-actions">{draftSuggestion.evidenceToRecord.map(item => <button type="button" key={item.kind} onClick={() => prepareEvidenceReference(item)}>Prepare {item.kind.replaceAll('_', ' ')} evidence</button>)}</div>
              </div>}
            </div>
            <h3>Evidence references</h3>
            <ul>{(selected.evidence || []).map(item => <li key={item.id}>{item.kind}: {item.source_ref} (version {item.source_version})</li>)}</ul>
            <form onSubmit={addEvidence}>
              <label>Evidence kind <select required value={evidence.kind} onChange={event => setEvidence({ ...evidence, kind: event.target.value })}><option value="">Choose kind</option>{(policy.evidenceKinds || []).map(kind => <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>)}</select></label>
              <label>Opaque source reference <input required value={evidence.sourceRef} onChange={event => setEvidence({ ...evidence, sourceRef: event.target.value })} /></label>
              <label>Source version <input required value={evidence.sourceVersion} onChange={event => setEvidence({ ...evidence, sourceVersion: event.target.value })} /></label>
              <label>SHA-256 digest <input required pattern="[a-fA-F0-9]{64}" value={evidence.sha256} onChange={event => setEvidence({ ...evidence, sha256: event.target.value })} /></label>
              <label>Captured at <input required type="datetime-local" value={evidence.capturedAt} onChange={event => setEvidence({ ...evidence, capturedAt: event.target.value })} /></label>
              <button disabled={busy}>Record evidence reference</button>
            </form>
            <h3>Next decision</h3>
            <label>Reason <textarea minLength="8" maxLength="2000" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain the reviewed evidence and decision" /></label>
            <div className="governed-actions">{actions.map(rule => <button type="button" key={rule.action} disabled={busy || reason.trim().length < 8 || !actionReady(rule.action)} onClick={() => transition(rule.action)} title={!actionReady(rule.action) ? 'A platform connector and receipt are required' : ''}>{rule.action.replaceAll('_', ' ')}</button>)}</div>
            {!actions.length && <p>No further transition is available.</p>}
            <h3>Decision history</h3>
            <ol>{history.map(event => <li key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.actor_id} · {event.action || event.event_type}: {event.reason || 'Recorded'}</li>)}</ol>
          </>}
        </section>
      </div>
    </>}
  </div>;
}
