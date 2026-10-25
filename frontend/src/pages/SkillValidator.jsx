import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyGitHubSkills } from '../api/client';

export default function SkillValidator({ showToast }) {
  const [username, setUsername] = useState('asharao');
  const [skill, setSkill] = useState('YOLOv8 & Computer Vision');
  const [certTitle, setCertTitle] = useState('AI Computer Vision & Deep Learning Hackathon');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      showToast('Please enter a GitHub username.', 'error');
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const data = await verifyGitHubSkills({
        github_username: username.trim(),
        claimed_skill: skill.trim(),
        certificate_title: certTitle.trim(),
      });
      setResult(data);
      if (data.classification === 'PRACTICAL_EVIDENCE_CONFIRMED') {
        showToast('Practical code evidence confirmed on GitHub!', 'success');
      } else if (data.classification === 'THEORY_ONLY_NO_MATCHING_CODE') {
        showToast('Theory only — no matching code repositories found.', 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'GitHub skill verification failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const setPreset = (presetUser, presetSkill, presetCert) => {
    setUsername(presetUser);
    setSkill(presetSkill);
    setCertTitle(presetCert);
  };

  const getBannerStyle = (classification) => {
    switch (classification) {
      case 'PRACTICAL_EVIDENCE_CONFIRMED':
      case 'PRACTICAL_EVIDENCE_FOUND':
        return 'verify-banner-ok';
      case 'THEORY_ONLY_NO_MATCHING_CODE':
        return 'verify-banner-warn';
      case 'USER_NOT_FOUND':
      case 'NO_PUBLIC_REPOSITORIES':
      default:
        return 'verify-banner-bad';
    }
  };

  const getBannerText = (classification) => {
    switch (classification) {
      case 'PRACTICAL_EVIDENCE_CONFIRMED':
        return '✓ PRACTICAL EVIDENCE CONFIRMED — Active Codebase & Frameworks Verified';
      case 'PRACTICAL_EVIDENCE_FOUND':
        return '✓ MODERATE PRACTICAL EVIDENCE — Relevant Codebase Found';
      case 'THEORY_ONLY_NO_MATCHING_CODE':
        return '⚠ THEORY ONLY — No Matching Code Modules, Imports, or Pipelines Found';
      case 'USER_NOT_FOUND':
        return '✕ GITHUB USER NOT FOUND';
      case 'NO_PUBLIC_REPOSITORIES':
      default:
        return '✕ NO PUBLIC REPOSITORIES FOUND';
    }
  };

  const formatDepthLabel = (depth) => {
    switch (depth) {
      case 'ADVANCED_COMPUTER_VISION_PIPELINE':
        return '🎯 YOLOv8 & Vision Pipeline';
      case 'PRODUCTION_PIPELINE':
        return '⚙ Production Pipeline';
      case 'PRODUCTION_SMART_CONTRACT':
        return '⛓ EVM Smart Contract';
      case 'PRODUCTION_MICROSERVICE':
        return '⚙ Backend Microservice';
      case 'APPLIED_FRONTEND':
        return '🖥 Component Architecture';
      case 'APPLIED_SYSTEM':
        return '🛡 Applied System';
      default:
        return '📁 Functional Codebase';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Skill & GitHub Validator</div>
        <div className="page-subtitle">
          Recruiter tool to prove whether claimed technical certificates (Python, YOLOv8, AI/ML, Hackathons) are backed by real practical code
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 820, marginBottom: 24 }}>
        <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>
          Candidate GitHub & Technical Claim Lookup
        </div>

        {/* PRESET CHIPS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
            Quick Demo Presets:
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            onClick={() => setPreset('asharao', 'YOLOv8 & Computer Vision', 'Autonomous Computer Vision Hackathon Winner')}
          >
            Asha Rao (YOLOv8 & Vision)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            onClick={() => setPreset('asharao', 'Python & AI/ML', 'Malware Detection & Python Capstone')}
          >
            Asha Rao (Python & AI)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            onClick={() => setPreset('asharao', 'Solidity & Blockchain', 'Smart Contract Architecture Winner')}
          >
            Asha Rao (Blockchain)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            onClick={() => setPreset('devonvance', 'React & Frontend', 'Full-Stack Web Development Course')}
          >
            Devon Vance (React)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            onClick={() => setPreset('octocat', 'Python & AI/ML', '40-hr Python Video Course')}
          >
            Octocat (Theory Only Test)
          </button>
        </div>

        <form onSubmit={handleVerify}>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Candidate GitHub Username</label>
              <input
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. asharao, octocat, torvalds, or your username"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Claimed Technical Skill / Subject</label>
              <input
                className="input-field"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="e.g. YOLOv8, Python & AI/ML, Solidity, React"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Associated Certificate / Hackathon Title (Optional)</label>
            <input
              className="input-field"
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              placeholder="e.g. YOLOv8 Object Detection Hackathon 1st Place or 40-hr Python Course"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={analyzing} style={{ width: '100%', marginTop: 8 }}>
            {analyzing ? 'Performing Static Code & Context Analysis…' : 'Verify Practical GitHub Evidence'}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel"
            style={{ maxWidth: 820 }}
          >
            <div className={`verify-banner ${getBannerStyle(result.classification)}`}>
              {getBannerText(result.classification)}
            </div>

            {/* EXECUTIVE SUMMARY */}
            <div
              style={{
                background: 'var(--bg-panel-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Recruiter Evidence Evaluation
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {result.summary}
              </p>
            </div>

            {/* METRICS ROW */}
            <div className="stat-row" style={{ marginBottom: 24 }}>
              <div className="stat-card stat-cyan">
                <div className="stat-label">GitHub User</div>
                <div className="stat-value" style={{ fontSize: '1.1rem' }}>@{result.github_username}</div>
              </div>
              <div className="stat-card stat-violet">
                <div className="stat-label">Target Skill</div>
                <div className="stat-value" style={{ fontSize: '0.95rem' }}>{result.claimed_skill}</div>
              </div>
              <div className="stat-card stat-amber">
                <div className="stat-label">Matching Repos</div>
                <div className="stat-value">{result.matching_repos_count}</div>
              </div>
              <div className={`stat-card ${result.verified ? 'stat-ok' : 'stat-danger'}`}>
                <div className="stat-label">Practical Proof</div>
                <div className="stat-value" style={{ fontSize: '1.0rem' }}>
                  {result.verified ? 'CONFIRMED' : 'UNVERIFIED'}
                </div>
              </div>
            </div>

            {/* MATCHING CODE REPOSITORIES SHOWCASE */}
            <div className="panel-title" style={{ color: 'var(--accent-cyan)' }}>
              Discovered Practical Code Repositories ({result.matching_repos?.length || 0})
            </div>

            {result.matching_repos?.length === 0 ? (
              <div className="empty-state" style={{ background: 'var(--bg-panel-raised)', borderRadius: 'var(--radius-sm)', padding: 24 }}>
                No practical repositories applying "{result.claimed_skill}" were detected in @{result.github_username}'s public profile.
                <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                  Static analysis inspected files, imports, and dependencies. The candidate may possess theoretical course certificates, but lacks public verifiable code artifacts for this skill.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {result.matching_repos.map((repo) => (
                  <div
                    key={repo.name}
                    style={{
                      background: 'var(--bg-panel-raised)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px 18px',
                    }}
                  >
                    {/* REPO HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.05rem' }}>📁</span>
                        {repo.html_url ? (
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}
                          >
                            {repo.name} ↗
                          </a>
                        ) : (
                          <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>{repo.name}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {repo.code_depth && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: 'rgba(139, 92, 246, 0.16)',
                              color: 'var(--accent-violet)',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                            }}
                          >
                            {formatDepthLabel(repo.code_depth)}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: 'rgba(6, 182, 212, 0.12)',
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          {repo.language}
                        </span>
                        {repo.stars > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            ★ {repo.stars}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                      {repo.description}
                    </div>

                    {/* CODE COMPOSITION */}
                    {repo.code_composition && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Code Composition:</span>
                        <span>{repo.code_composition}</span>
                      </div>
                    )}

                    {/* DETECTED FRAMEWORKS */}
                    {repo.detected_frameworks && repo.detected_frameworks.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Applied Tech:</span>
                        {repo.detected_frameworks.map((fw, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: 'rgba(6, 182, 212, 0.1)',
                              color: 'var(--accent-cyan)',
                              border: '1px solid rgba(6, 182, 212, 0.25)',
                            }}
                          >
                            {fw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* KEY CODE FILES */}
                    {repo.key_code_files && repo.key_code_files.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Inspected Files:</span>
                        {repo.key_code_files.map((file, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.66rem',
                              fontFamily: 'monospace',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--bg-panel)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {file}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CODE EVIDENCE FINDINGS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {repo.relevance_reasons?.map((r, idx) => (
                          <span key={idx} style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: 4 }}>
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                      {repo.updated_at && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          Updated: {repo.updated_at}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CRYPTOGRAPHIC ANCHOR PREVIEW */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <div className="panel-title" style={{ color: 'var(--accent-violet)' }}>
                SkillLedger Cryptographic Evidence Fingerprint
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel-raised)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <span className="truncate-hash" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  SHA-256: {result.evidence_fingerprint}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  Ready for On-Chain Manifest
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                This cryptographic fingerprint uniquely binds the candidate's verified codebase and static analysis to their SkillLedger credential, enabling automated drift detection if repositories or dependencies change.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
