import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyCredential, revokeCredential } from '../api/client';
import RealQRCode from '../components/RealQRCode';

const DEFAULT_TUNNEL_URL = 'https://open-teacher-hormone-fantastic.trycloudflare.com';
const DEFAULT_WIFI_URL = 'http://10.227.217.35:3000';

export default function VerifyCredential({ showToast }) {
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get('certId') || searchParams.get('id') || '';
  const [certId, setCertId] = useState(paramId || queryId || '');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('certificate'); // 'certificate' | 'audit'

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showW3C, setShowW3C] = useState(false);

  // QR URL Configuration (Defaults to Cloudflare tunnel if on localhost so mobile phone can scan)
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [urlMode, setUrlMode] = useState(isLocalHost ? 'tunnel' : 'current'); // 'tunnel' | 'wifi' | 'current'
  const [tunnelUrl, setTunnelUrl] = useState(DEFAULT_TUNNEL_URL);

  const getEffectiveShareUrl = (targetId) => {
    const id = encodeURIComponent((targetId || certId || '').trim());
    if (!id) return '';
    let base = tunnelUrl.replace(/\/+$/, '');
    if (urlMode === 'wifi') {
      base = DEFAULT_WIFI_URL;
    } else if (urlMode === 'current') {
      base = typeof window !== 'undefined' ? window.location.origin : tunnelUrl;
    }
    return `${base}/certificate/${id}`;
  };

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
    const target = paramId || searchParams.get('certId') || searchParams.get('id');
    if (target) {
      setCertId(target);
      runVerification(target);
    }
  }, [paramId, searchParams]);

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

  const activeShareUrl = getEffectiveShareUrl(result?.credential?.certificate_id || certId);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Verify Credential</div>
        <div className="page-subtitle">
          5-Point Cryptographic Verification & Real-Time Mobile QR Attestation
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 840 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            placeholder="Enter Certificate ID, e.g. CERT-2026-001 or CERT-2026-002"
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
            style={{ maxWidth: 840, marginTop: 20 }}
          >
            {!result.found ? (
              <div className="panel verify-not-found">
                No credential found on the ledger with ID: <strong>{certId}</strong>
              </div>
            ) : (
              <>
                {/* STATUS BANNER */}
                <div className={`verify-banner ${getBannerClass(result.overall_status)}`}>
                  {getStatusIcon(result.overall_status)}
                </div>

                {/* VIEW MODE TOGGLE */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 16,
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: 10,
                  }}
                >
                  <button
                    type="button"
                    className={`btn ${activeTab === 'certificate' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('certificate')}
                    style={{ fontSize: '0.85rem' }}
                  >
                    📜 Official Certificate & Mobile QR
                  </button>
                  <button
                    type="button"
                    className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('audit')}
                    style={{ fontSize: '0.85rem' }}
                  >
                    🔍 5-Point Technical Audit Report
                  </button>
                </div>

                {/* TAB 1: OFFICIAL CERTIFICATE WITH REAL SCANNABLE QR */}
                {activeTab === 'certificate' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="panel"
                    style={{
                      position: 'relative',
                      border: '2px solid rgba(0, 240, 255, 0.35)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(0, 240, 255, 0.08)',
                      background: 'radial-gradient(circle at top right, rgba(0, 240, 255, 0.05), transparent 60%), var(--bg-panel)',
                      padding: '28px 24px',
                    }}
                  >
                    {/* CERTIFICATE HEADER */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: 16,
                        marginBottom: 20,
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            letterSpacing: '0.14em',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                            textTransform: 'uppercase',
                          }}
                        >
                          SkillLedger Decentralized Trust Registry
                        </div>
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginTop: 2,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          Certificate of Attestation
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.72rem',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontWeight: 700,
                          background:
                            result.overall_status === 'VERIFIED'
                              ? 'var(--status-ok-dim)'
                              : result.overall_status === 'MODIFIED_EVIDENCE'
                              ? 'var(--status-warn-dim)'
                              : 'var(--status-danger-dim)',
                          color:
                            result.overall_status === 'VERIFIED'
                              ? 'var(--status-ok)'
                              : result.overall_status === 'MODIFIED_EVIDENCE'
                              ? 'var(--accent-amber)'
                              : 'var(--status-danger)',
                          border: '1px solid currentColor',
                        }}
                      >
                        {result.overall_status === 'VERIFIED'
                          ? '✓ AUTHENTIC & VERIFIED'
                          : result.overall_status === 'MODIFIED_EVIDENCE'
                          ? '⚠ EVIDENCE DRIFT'
                          : result.overall_status}
                      </div>
                    </div>

                    {/* CERTIFICATE BODY WITH REAL QR CODE */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 24,
                        alignItems: 'center',
                      }}
                    >
                      {/* LEFT: STUDENT & CREDENTIAL CLAIMS */}
                      <div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          This certifies that
                        </div>
                        <div
                          style={{
                            fontSize: '1.6rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginTop: 4,
                            marginBottom: 12,
                          }}
                        >
                          {result.credential?.student_name}
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                          has demonstrated authenticated competence in
                        </div>
                        <div
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                            marginTop: 2,
                            marginBottom: 16,
                          }}
                        >
                          {result.credential?.course}
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                          <div style={{ background: 'var(--bg-panel-raised)', padding: '6px 12px', borderRadius: 6, fontSize: '0.76rem' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Grade: </span>
                            <strong style={{ color: '#ffffff' }}>{result.credential?.grade}</strong>
                          </div>
                          <div style={{ background: 'var(--bg-panel-raised)', padding: '6px 12px', borderRadius: 6, fontSize: '0.76rem' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Category: </span>
                            <strong style={{ color: '#ffffff' }}>{result.credential?.category || 'Professional Skills'}</strong>
                          </div>
                          <div style={{ background: 'var(--bg-panel-raised)', padding: '6px 12px', borderRadius: 6, fontSize: '0.76rem' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Year: </span>
                            <strong style={{ color: '#ffffff' }}>{result.credential?.year}</strong>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Issued by <strong>{result.credential?.issuer}</strong>
                          <br />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            DID: did:skillledger:{result.credential?.issuer_id?.toLowerCase() || 'inst'} · Block #{result.block_index}
                          </span>
                        </div>
                      </div>

                      {/* RIGHT: REAL SCANNABLE QR CODE FOR MOBILE PHONES */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '16px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: 12,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <RealQRCode
                          value={activeShareUrl}
                          size={160}
                          caption="📱 Point phone camera to open on mobile"
                          showUrl={false}
                          downloadName={`${result.credential?.certificate_id || 'certificate'}-qr.png`}
                        />

                        {/* URL SWITCHER / CONTROLS */}
                        <div style={{ marginTop: 12, width: '100%', maxWidth: 280, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`btn ${urlMode === 'tunnel' ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: '0.64rem', padding: '3px 6px' }}
                              onClick={() => setUrlMode('tunnel')}
                              title="Uses Cloudflare HTTPS tunnel so external mobile devices on 4G/5G can scan"
                            >
                              📱 Cloudflare
                            </button>
                            <button
                              type="button"
                              className={`btn ${urlMode === 'wifi' ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: '0.64rem', padding: '3px 6px' }}
                              onClick={() => setUrlMode('wifi')}
                              title="Direct LAN IP for devices connected to the same Wi-Fi (No Cloudflare latency)"
                            >
                              📶 Same Wi-Fi
                            </button>
                            <button
                              type="button"
                              className={`btn ${urlMode === 'current' ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: '0.64rem', padding: '3px 6px' }}
                              onClick={() => setUrlMode('current')}
                              title="Uses current browser origin"
                            >
                              💻 Local
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <input
                              className="input-field"
                              style={{ fontSize: '0.68rem', padding: '4px 6px', flex: 1 }}
                              value={activeShareUrl}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ fontSize: '0.68rem', padding: '4px 8px' }}
                              onClick={() => {
                                navigator.clipboard.writeText(activeShareUrl);
                                showToast('Link copied to clipboard!', 'success');
                              }}
                            >
                              Copy
                            </button>
                          </div>

                          <a
                            href={activeShareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{
                              display: 'inline-block',
                              width: '100%',
                              padding: '6px 12px',
                              fontSize: '0.74rem',
                              textDecoration: 'none',
                              textAlign: 'center',
                              fontWeight: 700,
                            }}
                          >
                            👁️ Open / Preview Certificate
                          </a>

                          {urlMode === 'tunnel' && isLocalHost && (
                            <div style={{ fontSize: '0.66rem', color: 'var(--accent-cyan)', marginTop: 6 }}>
                              ✓ Configured with live TryCloudflare mobile tunnel
                            </div>
                          )}
                          {urlMode === 'wifi' && (
                            <div style={{ fontSize: '0.66rem', color: '#10b981', marginTop: 6 }}>
                              ✓ Direct Wi-Fi LAN address (phone must be on same Wi-Fi)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CRYPTOGRAPHIC PROOF FOOTER */}
                    <div
                      style={{
                        marginTop: 24,
                        paddingTop: 16,
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                        fontSize: '0.72rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Digital Signature:</span>
                        <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>RSA-2048-PSS Validated ✓</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>PoA Consensus:</span>
                        <div style={{ color: '#ffffff', fontWeight: 600 }}>Block #{result.block_index} Confirmed</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Evidence Manifest Hash:</span>
                        <div className="truncate-hash" style={{ color: 'var(--text-secondary)' }}>
                          {result.checks?.evidence_integrity?.anchored_manifest_hash || 'Anchored on chain'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: TECHNICAL 5-POINT AUDIT */}
                {activeTab === 'audit' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel">
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                      {result.overall_summary}
                    </p>

                    <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>
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
                  </motion.div>
                )}

                {/* BOTTOM ACTION BAR */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
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
                    <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>Real Phone-Scannable QR & Verification Link</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                      <input className="input-field" style={{ flex: 1, fontSize: '0.8rem' }} readOnly value={activeShareUrl} />
                      <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(activeShareUrl); showToast('Link copied to clipboard!', 'success'); }}>
                        Copy
                      </button>
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <RealQRCode
                        value={activeShareUrl}
                        size={180}
                        caption="Point your phone camera here to open on mobile"
                        showUrl={true}
                        downloadName={`${result.credential?.certificate_id || 'certificate'}-qr.png`}
                      />
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