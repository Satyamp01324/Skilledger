import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInstitutions, registerInstitution } from '../api/client';

export default function TrustRegistryPage({ showToast }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: 'Engineering & Technology',
    academic: true,
    skills: true,
    internship: true,
    engineering: false,
  });

  const loadInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInstitutions();
      setInstitutions(res.institutions || []);
    } catch (e) {
      showToast('Failed to load Trust Registry institutions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Please enter an institution name.', 'error');
      return;
    }

    const authorized_categories = [];
    if (form.academic) authorized_categories.push('Academic');
    if (form.skills) authorized_categories.push('Professional Skills');
    if (form.internship) authorized_categories.push('Internship');
    if (form.engineering) authorized_categories.push('Engineering');

    if (authorized_categories.length === 0) {
      showToast('Please select at least one authorized category.', 'error');
      return;
    }

    setRegistering(true);
    try {
      const res = await registerInstitution({
        name: form.name.trim(),
        category: form.category.trim(),
        authorized_categories,
      });
      showToast(res.message, 'success');
      setShowModal(false);
      setForm({
        name: '',
        category: 'Engineering & Technology',
        academic: true,
        skills: true,
        internship: true,
        engineering: false,
      });
      loadInstitutions();
    } catch (e) {
      showToast(e.response?.data?.error || 'Registration failed.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Decentralized Trust Registry</div>
          <div className="page-subtitle">
            On-chain institutional identity registry, W3C DIDs, and category-level issuance authorization
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Register New Institution
        </button>
      </div>

      {/* METRICS ROW */}
      <div className="stat-row" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-cyan">
          <div className="stat-label">Registered Authorities</div>
          <div className="stat-value">{institutions.length}</div>
        </div>
        <div className="stat-card stat-ok">
          <div className="stat-label">Registry Status</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>ACTIVE</div>
        </div>
        <div className="stat-card stat-violet">
          <div className="stat-label">Identifier Standard</div>
          <div className="stat-value" style={{ fontSize: '1.05rem' }}>W3C DID</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-label">Consensus</div>
          <div className="stat-value" style={{ fontSize: '1.05rem' }}>PoA (3 Nodes)</div>
        </div>
      </div>

      {/* EXPLAINER CALLOUT */}
      <div
        style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          PS 2 Architecture · Workflow #1: Institution Registration & Authorization
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Participating institutions establish trust through this shared, decentralized registry. The blockchain ledger maintains immutable records of authorized issuers and permitted credential categories. Unauthorized entities attempting to issue credentials are automatically rejected by blockchain policy.
        </p>
      </div>

      {/* INSTITUTIONS LIST */}
      <div className="panel">
        <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>
          Authorized Institutional Entities ({institutions.length})
        </div>

        {loading ? (
          <div className="empty-state">Loading Trust Registry from blockchain ledger…</div>
        ) : institutions.length === 0 ? (
          <div className="empty-state">No institutions registered yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {institutions.map((inst) => (
              <div
                key={inst.institution_id}
                style={{
                  background: 'var(--bg-panel-raised)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.1rem' }}>🏛</span>
                      <span style={{ fontWeight: 700, fontSize: '1.0rem', color: 'var(--text-primary)' }}>
                        {inst.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        ID: {inst.institution_id}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--accent-violet)', fontFamily: 'var(--font-mono)' }}>
                        DID: {inst.did || `did:skillledger:${inst.institution_id.toLowerCase()}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'var(--status-ok-dim)',
                        color: 'var(--status-ok)',
                        border: '1px solid rgba(61, 220, 132, 0.3)',
                      }}
                    >
                      ● {inst.status}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      Authorized Categories:
                    </span>
                    {inst.authorized_categories?.map((cat, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.68rem',
                          background: 'var(--bg-panel)',
                          border: '1px solid var(--border-subtle)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        ✓ {cat}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    Domain: {inst.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REGISTRATION MODAL */}
      <AnimatePresence>
        {showModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(5, 8, 16, 0.85)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="panel"
              style={{ maxWidth: 520, width: '100%', background: 'var(--bg-panel)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="panel-title" style={{ margin: 0, color: 'var(--accent-cyan)' }}>
                  Register Institutional Identity
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '1.2rem', cursor: 'pointer' }}
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">Institution Legal Name</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Cambridge Institute of Technology"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Institutional Domain / Sector</label>
                  <input
                    className="input-field"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Academic & Engineering"
                    required
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="input-label" style={{ display: 'block', marginBottom: 8 }}>
                    Authorized Credential Issuance Categories:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={form.academic}
                        onChange={(e) => setForm({ ...form, academic: e.target.checked })}
                      />
                      Academic Degrees
                    </label>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={form.skills}
                        onChange={(e) => setForm({ ...form, skills: e.target.checked })}
                      />
                      Professional Skills
                    </label>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={form.internship}
                        onChange={(e) => setForm({ ...form, internship: e.target.checked })}
                      />
                      Internship Records
                    </label>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={form.engineering}
                        onChange={(e) => setForm({ ...form, engineering: e.target.checked })}
                      />
                      Engineering Certs
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => setShowModal(false)}
                    disabled={registering}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={registering}
                  >
                    {registering ? 'Anchoring on Ledger…' : 'Register Institution'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
