import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getPending, issueCredential, sealBlock } from '../api/client';

const emptyForm = {
  certificate_id: '',
  student_name: '',
  course: '',
  grade: '',
  year: '2026',
  category: 'Professional Skills',
  evidence_title: '',
  evidence_type: 'code_repository',
  evidence_url: '',
  evidence_content: '',
};

export default function IssueCredential({ showToast }) {
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sealing, setSealing] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const data = await getPending();
      setPending(data.pending || []);
    } catch (e) {
      /* silent - dashboard will surface connectivity errors */
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const evidence_items = form.evidence_title.trim() ? [{
        title: form.evidence_title.trim(),
        type: form.evidence_type,
        source_url: form.evidence_url.trim(),
        content: form.evidence_content.trim() || form.evidence_url.trim() || form.evidence_title.trim(),
        provenance: 'AUTHENTICATED_SOURCE',
      }] : [];

      const payload = {
        certificate_id: form.certificate_id.trim(),
        student_name: form.student_name.trim(),
        course: form.course.trim(),
        grade: form.grade.trim(),
        year: form.year.trim(),
        category: form.category,
        evidence_items,
      };

      const res = await issueCredential(payload);
      showToast(res.message, 'success');
      setForm(emptyForm);
      loadPending();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to issue credential.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeal = async () => {
    setSealing(true);
    try {
      const res = await sealBlock();
      showToast(res.message, 'success');
      loadPending();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to seal block.';
      showToast(msg, 'error');
    } finally {
      setSealing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Issue Credential</div>
        <div className="page-subtitle">Attach supporting evidence, generate cryptographic manifest, and sign via RSA-2048</div>
      </div>

      <div className="grid-main-side">
        <div className="panel">
          <div className="panel-title">New Professional Credential</div>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Certificate ID</label>
                <input className="input-field" value={form.certificate_id} onChange={handleChange('certificate_id')} placeholder="CERT-2026-002" required />
              </div>
              <div className="input-group">
                <label className="input-label">Holder / Student Name</label>
                <input className="input-field" value={form.student_name} onChange={handleChange('student_name')} placeholder="Devon Vance" required />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Skill / Course Title</label>
                <input className="input-field" value={form.course} onChange={handleChange('course')} placeholder="Full-Stack Cryptography" required />
              </div>
              <div className="input-group">
                <label className="input-label">Credential Category</label>
                <select className="input-field" value={form.category} onChange={handleChange('category')}>
                  <option value="Professional Skills">Professional Skills</option>
                  <option value="Academic">Academic</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Grade / Attestation</label>
                <input className="input-field" value={form.grade} onChange={handleChange('grade')} placeholder="Distinction (A+)" required />
              </div>
              <div className="input-group">
                <label className="input-label">Issuance Year</label>
                <input className="input-field" value={form.year} onChange={handleChange('year')} placeholder="2026" required />
              </div>
            </div>

            <div style={{ marginTop: 12, marginBottom: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>Supporting Evidence Manifest</div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Evidence Title</label>
                  <input className="input-field" value={form.evidence_title} onChange={handleChange('evidence_title')} placeholder="e.g. Capstone Source Repo" />
                </div>
                <div className="input-group">
                  <label className="input-label">Evidence Type</label>
                  <select className="input-field" value={form.evidence_type} onChange={handleChange('evidence_type')}>
                    <option value="code_repository">Code Repository / Git Commit</option>
                    <option value="project_report">Project Report / Spec</option>
                    <option value="assessment_report">Assessment Report</option>
                    <option value="evaluator_attestation">Evaluator Attestation</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Source URL or Protected Storage Reference</label>
                <input className="input-field" value={form.evidence_url} onChange={handleChange('evidence_url')} placeholder="https://github.com/devon/cryptography-lab" />
              </div>
              <div className="input-group">
                <label className="input-label">Captured Evidence Snapshot / Attestation Notes</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={form.evidence_content}
                  onChange={handleChange('evidence_content')}
                  placeholder="SHA-256 fingerprint will be anchored in the on-chain evidence manifest..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
              {submitting ? 'Generating Manifest & Signing…' : 'Sign & Queue Credential'}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-title">Pending Batch ({pending.length})</div>
          {pending.length === 0 ? (
            <div className="empty-state">No credentials pending. Issue one to begin a new batch.</div>
          ) : (
            <div className="pending-list">
              {pending.map((c) => (
                <motion.div key={c.certificate_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pending-item">
                  <div className="pending-item-name">{c.student_name}</div>
                  <div className="pending-item-meta">{c.certificate_id} · {c.course}</div>
                  {c.evidence_manifest_hash && (
                    <div className="pending-item-meta truncate-hash" style={{ color: 'var(--accent-cyan)', fontSize: '0.68rem', marginTop: 4 }}>
                      Manifest: {c.evidence_manifest_hash.slice(0, 18)}…
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16 }}
            disabled={pending.length === 0 || sealing}
            onClick={handleSeal}
          >
            {sealing ? 'Running PoA Consensus…' : 'Seal Block (Run Consensus)'}
          </button>
        </div>
      </div>
    </div>
  );
}