import { useState } from 'react';
import { motion } from 'framer-motion';
import { tamperDemo, demoTamperEvidence, demoMakeUnavailable, demoResetEvidence, demoUnauthorizedIssuer, resetChain } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function TamperDemo({ showToast }) {
  const [result, setResult] = useState(null);
  const [driftResult, setDriftResult] = useState(null);
  const [unauthResult, setUnauthResult] = useState(null);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  const handleTamper = async () => {
    setRunning(true);
    try {
      const res = await tamperDemo();
      setResult(res.data);
      showToast(res.message, 'error');
    } catch (e) {
      const msg = e.response?.data?.error || 'Tamper demo failed.';
      showToast(msg, 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleEvidenceDrift = async () => {
    try {
      const res = await demoTamperEvidence('CERT-2026-001');
      setDriftResult({ status: 'MODIFIED', message: res.message });
      showToast('Evidence altered! Drift will now be detected upon verification.', 'error');
    } catch (e) {
      showToast(e.response?.data?.error || 'Drift demo failed.', 'error');
    }
  };

  const handleMakeUnavailable = async () => {
    try {
      const res = await demoMakeUnavailable('CERT-2026-001');
      setDriftResult({ status: 'UNAVAILABLE', message: res.message });
      showToast('Evidence marked UNAVAILABLE.', 'error');
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed.', 'error');
    }
  };

  const handleResetEvidence = async () => {
    try {
      const res = await demoResetEvidence('CERT-2026-001');
      setDriftResult({ status: 'UNCHANGED', message: res.message });
      showToast('Evidence restored to pristine state.', 'success');
    } catch (e) {
      showToast(e.response?.data?.error || 'Reset failed.', 'error');
    }
  };

  const handleUnauthorizedIssuer = async () => {
    try {
      await demoUnauthorizedIssuer('Rogue Online Academy', 'Academic');
      showToast('Unexpected: Rogue issuance was allowed!', 'error');
    } catch (e) {
      const errorMsg = e.response?.data?.error || 'Issuance rejected by Trust Registry policy (403 Forbidden).';
      setUnauthResult({
        blocked: true,
        message: errorMsg,
        actor: 'Rogue Online Academy',
        status: 403,
      });
      showToast('Policy Enforced: Unauthorized issuer rejected (403 Forbidden)', 'error');
    }
  };

  const handleFullReset = async () => {
    try {
      await resetChain();
      setResult(null);
      setDriftResult(null);
      setUnauthResult(null);
      showToast('Ledger reset to initial state with demo credentials.', 'success');
    } catch (e) {
      showToast('Reset failed.', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Tamper & Drift Demo</div>
        <div className="page-subtitle">
          Mandatory MVP Demonstrations: Modified Records, Evidence Drift, Unauthorized Issuers, and Chain Tampering
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        {/* SCENARIO A: EVIDENCE DRIFT DEMO */}
        <div className="panel">
          <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>
            Scenario A: Evidence Integrity & Drift Detection (Test 5 & 6)
          </div>
          <p className="tamper-explainer">
            SkillLedger differentiates between digital signatures and external evidence integrity.
            Simulate a developer modifying code or editing an attested report after credential issuance —
            the signature remains authentic, but SkillLedger flags <strong>MODIFIED</strong> (Drift Detected).
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-danger" onClick={handleEvidenceDrift}>
              Simulate Evidence Drift (Test 5)
            </button>
            <button className="btn btn-ghost" onClick={handleMakeUnavailable}>
              Simulate Inaccessible Source (Test 6)
            </button>
            <button className="btn btn-ghost" onClick={handleResetEvidence}>
              Restore Pristine Evidence
            </button>
          </div>

          {driftResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`tamper-result ${driftResult.status === 'UNCHANGED' ? 'tamper-result-ok' : 'tamper-result-bad'}`}
            >
              <div className="tamper-result-title">
                {driftResult.status === 'MODIFIED' ? '⚠ EVIDENCE DRIFT TRIGGERED' : driftResult.status === 'UNAVAILABLE' ? '⚠ EVIDENCE UNAVAILABLE' : '✓ EVIDENCE INTACT'}
              </div>
              <div className="tamper-result-message">{driftResult.message}</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => navigate('/verify?certId=CERT-2026-001')}
              >
                Verify CERT-2026-001 to View Report →
              </button>
            </motion.div>
          )}
        </div>

        {/* SCENARIO B: UNAUTHORIZED ISSUER REJECTION (Mandatory MVP Req #5) */}
        <div className="panel">
          <div className="panel-title" style={{ color: 'var(--accent-amber)' }}>
            Scenario B: Rejection of Unauthorized Issuer (MVP Req #5 & Test 3)
          </div>
          <p className="tamper-explainer">
            The decentralized Trust Registry prevents rogue or unaccredited entities from minting credentials.
            Simulate an unauthorized entity (e.g. <em>"Rogue Online Academy"</em>) attempting to issue a degree without registry permissions.
            The blockchain smart contract policy immediately denies the transaction with <strong>403 Forbidden</strong> and records the policy violation.
          </p>
          <button className="btn btn-danger" onClick={handleUnauthorizedIssuer} style={{ marginTop: 16 }}>
            Simulate Unauthorized Issuance Attempt
          </button>

          {unauthResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="tamper-result tamper-result-bad"
            >
              <div className="tamper-result-title">
                ✕ 403 FORBIDDEN — UNAUTHORIZED ISSUER REJECTED
              </div>
              <div className="tamper-result-message">{unauthResult.message}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => navigate('/institutions')}
                >
                  View Trust Registry Authorities →
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => navigate('/audit')}
                >
                  View Blocked Event in Audit Explorer →
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* SCENARIO C: RAW BLOCK TAMPER DEMO */}
        <div className="panel">
          <div className="panel-title" style={{ color: 'var(--accent-violet)' }}>
            Scenario C: Direct Block Storage Tampering (Test 2)
          </div>
          <p className="tamper-explainer">
            Simulates an attacker with raw database access editing a credential record directly in storage —
            skipping PoA consensus and university signing entirely.
            Block #1's stored hash will no longer match its recomputed hash, which breaks the cryptographic chain.
          </p>
          <button className="btn btn-danger" onClick={handleTamper} disabled={running} style={{ marginTop: 16 }}>
            {running ? 'Tampering…' : 'Tamper With Block #1'}
          </button>

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`tamper-result ${result.is_valid ? 'tamper-result-ok' : 'tamper-result-bad'}`}
            >
              <div className="tamper-result-title">
                {result.is_valid ? 'Chain still valid (unexpected)' : 'CHAIN INTEGRITY BROKEN'}
              </div>
              <div className="tamper-result-message">{result.validity_message}</div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 14 }}
                onClick={() => navigate('/chain')}
              >
                View it on the Chain Visualization →
              </button>
            </motion.div>
          )}
        </div>

        {/* PANEL 4: RESET */}
        <div className="panel">
          <div className="panel-title">Reset Demo Environment</div>
          <p className="tamper-explainer">
            Reset the blockchain ledger and evidence state back to the fresh genesis state with seeded sample credentials.
          </p>
          <button className="btn btn-ghost" onClick={handleFullReset} style={{ marginTop: 12 }}>
            Reset Ledger & Evidence to Clean State
          </button>
        </div>
      </div>
    </div>
  );
}