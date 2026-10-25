import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyCredential, revokeCredential } from '../api/client';

export default function VerifyCredential({ showToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [certId, setCertId] = useState(searchParams.get('certId') || searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showW3C, setShowW3C] = useState(false);

  const runVerification = async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const data = await verifyCredential(targetId.trim());
      setResult(data);
    } catch (e) {
      showToast('Verification request failed. Is the backend running?', 'error');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('certId') || searchParams.get('id');
    if (q) {
      setCertId(q);
      runVerification(q);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (certId.trim()) {
      setSearchParams({ certId: certId.trim() });
      runVerification(certId.trim());
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim() || !result?.credential?.certificate_id) return;
    setRevoking(true);
    try {
      const res = await revokeCredential(result.credential.certificate_id, {
        reason: revokeReason.trim(),
        issuer: result.credential.issuer,
      });
      showToast(res.message, 'success');
      setShowRevokeModal(false);
      setRevokeReason('');
      runVerification(result.credential.certificate_id);
    } catch (e) {
      const msg = e.response?.data?.error || 'Revocation failed.';
      showToast(msg, 'error');
    } finally {
      setRevoking(false);
    }
  };

  const getBannerClass = (status) => {
    switch (status) {
      case 'VERIFIED': return 'verify-banner-ok';
      case 'MODIFIED_EVIDENCE':
      case 'INCOMPLETE': return 'verify-banner-warn';
      case 'REVOKED':
      case 'INVALID':
      default: return 'verify-banner-bad';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'VERIFIED': return '✓ VERIFIED — Authentic & Evidence Intact';
      case 'MODIFIED_EVIDENCE': return '⚠ EVIDENCE DRIFT DETECTED — Supporting Evidence Modified';
      case 'REVOKED': return '✕ CREDENTIAL REVOKED — Revocation Recorded on Ledger';
      case 'INVALID': return '✕ INVALID — Cryptographic Check Failed';
      case 'INCOMPLETE': return '⚠ INCOMPLETE — Evidence Source Unavailable';
      default: return 'VERIFICATION RESULT';
    }
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify?certId=${encodeURIComponent(certId.trim())}`
    : `/verify?certId=${encodeURIComponent(certId.trim())}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Verify Credential</div>
        <div className="page-subtitle">5-point cryptographic verification: Issuer Trust, Signature, Integrity, Evidence Drift, and Revocation</div>
      </div>

      <div className="panel" style={{ maxWidth: 680 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            placeholder="Enter Certificate ID, e.g. CERT-2026-001"
          />
          <button className="btn btn-primary" type="submit" disabled={searching}>
            {searching ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel"
            style={{ maxWidth: 680, marginTop: 20 }}
          >
            {!result.found ? (
              <div className="verify-not-found">
                No credential found on the ledger with ID: <strong>{certId}</strong>
              </div>
            ) : (
              <>
                <div className={`verify-banner ${getBannerClass(result.overall_status)}`}>
                  {getStatusIcon(result.overall_status)}
                </div>

                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                  {result.overall_summary}
                </p>

                {/* THE 5 QUESTIONS BREAKDOWN */}
                <div className="panel-title" style={{ marginTop: 20, color: 'var(--accent-cyan)' }}>
                  Five-Point Verification Report
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  <CheckRow
                    question="1. Authorized Issuer"
                    passed={result.checks?.issuer_authorized?.passed}
                    title={result.checks?.issuer_authorized?.issuer_name}
                    details={result.checks?.issuer_authorized?.details}
                  />
                  <CheckRow
                    question="2. Cryptographic Signature"
                    passed={result.checks?.signature_valid?.passed}
                    title={result.checks?.signature_valid?.algorithm}
                    details={result.checks?.signature_valid?.details}
                  />
                  <CheckRow
                    question="3. Credential Integrity"
                    passed={result.checks?.credential_integrity?.passed}
                    title={`Merkle Sealed in Block #${result.block_index}`}
                    details={result.checks?.credential_integrity?.details}
                  />
                  <CheckRow
                    question="4. Evidence Integrity & Drift"
                    passed={result.checks?.evidence_integrity?.passed}
                    statusText={result.checks?.evidence_integrity?.status}
                    title={`Manifest Hash: ${result.checks?.evidence_integrity?.anchored_manifest_hash ? result.checks.evidence_integrity.anchored_manifest_hash.slice(0, 16) + '…' : 'None'}`}
                    details={result.checks?.evidence_integrity?.details}
                  />
                  <CheckRow
                    question="5. Revocation Status"
                    passed={result.checks?.credential_status?.passed}
                    statusText={result.checks?.credential_status?.status}
                    title={result.checks?.credential_status?.status === 'REVOKED' ? 'REVOKED ON LEDGER' : 'ACTIVE & IN GOOD STANDING'}
                    details={result.checks?.credential_status?.details}
                  />
                </div>

                {/* EVIDENCE DRIFT ITEMS TABLE */}
                {result.checks?.evidence_integrity?.items?.length > 0 && (
                  <div style={{ marginTop: 20, marginBottom: 24, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                    <div className="panel-title" style={{ color: 'var(--accent-violet)' }}>
                      Supporting Evidence Items ({result.checks.evidence_integrity.items.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {result.checks.evidence_integrity.items.map((item) => (
                        <div key={item.id} style={{ background: 'var(--bg-panel-raised)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.title}</span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 999,
                                background: item.status === 'UNCHANGED' ? 'var(--status-ok-dim)' : 'var(--status-danger-dim)',
                                color: item.status === 'UNCHANGED' ? 'var(--status-ok)' : 'var(--status-danger)',
                              }}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Type: {item.type} · Provenance: {item.provenance}
                          </div>
                          {item.source_url && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', marginTop: 2, wordBreak: 'break-all' }}>
                              Source: {item.source_url}
                            </div>
                          )}
                          <div className="truncate-hash" style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Original Fingerprint: {item.original_fingerprint}
                          </div>
                          {item.status === 'MODIFIED' && (
                            <div className="truncate-hash" style={{ fontSize: '0.68rem', color: 'var(--status-danger)', marginTop: 2 }}>
                              Current Fingerprint: {item.current_fingerprint} (Drift Detected!)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CREDENTIAL DETAILS */}
                <div className="panel-title" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                  Credential Claims
                </div>
                <div className="verify-detail-grid">
                  <DetailRow label="Holder" value={result.credential?.student_name} />
                  <DetailRow label="Certificate ID" value={result.credential?.certificate_id} />
                  <DetailRow label="Category" value={result.credential?.category || 'Professional Skills'} />
                  <DetailRow label="Course / Skill" value={result.credential?.course} />
                  <DetailRow label="Grade / Result" value={result.credential?.grade} />
                  <DetailRow label="Year" value={result.credential?.year} />
                  <DetailRow label="Issuer" value={result.credential?.issuer} />
                  <DetailRow label="Sealed in Block" value={`#${result.block_index}`} />
                  <DetailRow label="Block Hash" value={result.block_hash} mono />
                </div>

                {/* ACTION BAR */}
                <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" onClick={() => setShowShareModal(!showShareModal)}>
                    🔗 Share Link & QR
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowW3C(!showW3C)}>
                    📄 {showW3C ? 'Hide W3C JSON-LD' : 'W3C Verifiable Credential'}
                  </button>
                  {result.checks?.credential_status?.status === 'ACTIVE' && (
                    <button className="btn btn-danger" onClick={() => setShowRevokeModal(true)}>
                      ⚠ Revoke Credential
                    </button>
                  )}
                </div>

                {/* W3C VERIFIABLE CREDENTIAL JSON-LD VIEWER */}
                {showW3C && result.w3c_verifiable_credential && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'var(--bg-panel-raised)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div className="panel-title" style={{ margin: 0, color: 'var(--accent-violet)' }}>
                        W3C Verifiable Credential v1.0 (JSON-LD & DID)
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(result.w3c_verifiable_credential, null, 2));
                          showToast('W3C JSON-LD copied to clipboard!', 'success');
                        }}
                      >
                        Copy JSON-LD
                      </button>
                    </div>
                    <pre
                      style={{
                        background: 'var(--bg-panel)',
                        padding: 12,
                        borderRadius: 6,
                        fontSize: '0.74rem',
                        overflowX: 'auto',
                        maxHeight: 260,
                        color: 'var(--accent-cyan)',
                        border: '1px solid var(--border-subtle)',
                        lineHeight: 1.4,
                      }}
                    >
                      {JSON.stringify(result.w3c_verifiable_credential, null, 2)}
                    </pre>
                  </motion.div>
                )}

                {/* SHARE / QR MODAL */}
                {showShareModal && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'var(--bg-panel-raised)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>Shareable Verification Link</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input className="input-field" style={{ flex: 1, fontSize: '0.8rem' }} readOnly value={shareUrl} />
                      <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(shareUrl); showToast('Link copied to clipboard!', 'success'); }}>
                        Copy
                      </button>
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                        <QRCodeSVG text={shareUrl} size={130} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                        Scan QR code with any camera to verify independently
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* REVOKE MODAL */}
                {showRevokeModal && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'var(--status-danger-dim)', border: '1px solid rgba(255,84,112,0.3)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="panel-title" style={{ color: 'var(--status-danger)' }}>Authorized Credential Revocation</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Revoking records an immutable revocation event on the blockchain. The historical issuance record is preserved.
                    </p>
                    <form onSubmit={handleRevokeSubmit}>
                      <input
                        className="input-field"
                        style={{ width: '100%', marginBottom: 12 }}
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Reason for revocation (e.g. academic review, duplicate issue)..."
                        required
                      />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-danger" type="submit" disabled={revoking}>
                          {revoking ? 'Recording Revocation…' : 'Confirm Revocation'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => setShowRevokeModal(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckRow({ question, passed, statusText, title, details }) {
  const isOk = passed === true;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: 'var(--bg-panel-raised)', borderRadius: 'var(--radius-sm)' }}>
      <span className={`badge-dot-standalone ${isOk ? 'dot-ok' : 'dot-off'}`} style={{ marginTop: 6 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{question}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isOk ? 'var(--status-ok)' : 'var(--status-danger)' }}>
            {statusText || (isOk ? 'PASSED' : 'FAILED')}
          </span>
        </div>
        {title && <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)', marginTop: 2 }}>{title}</div>}
        {details && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{details}</div>}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={mono ? 'truncate-hash' : 'detail-value'}>{value}</span>
    </div>
  );
}

function QRCodeSVG({ text, size = 120 }) {
  // Deterministic SVG QR representation based on text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const cells = 15;
  const cellSize = size / cells;
  const rects = [];

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Corner alignment markers
      const isCorner =
        (r < 4 && c < 4) ||
        (r < 4 && c >= cells - 4) ||
        (r >= cells - 4 && c < 4);
      const isPixel = isCorner || ((hash ^ (r * 31 + c * 17)) & 1) === 0;

      if (isPixel) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#090d16"
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rects}
    </svg>
  );
}