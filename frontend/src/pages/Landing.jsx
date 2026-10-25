import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Landing.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="hero-glow" />
        <nav className="landing-nav">
          <div className="landing-brand">
            <div className="landing-logo">⛓</div>
            <span>SkillLedger</span>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            Launch App →
          </button>
        </nav>

        <motion.div
          className="hero-content"
          initial="hidden"
          animate="show"
          variants={fadeUp}
        >
          <div className="hero-eyebrow">Evidence-Backed Credential Verification</div>
          <h1 className="hero-title">
            Proof Behind<br />
            <span className="hero-title-accent">Every Professional Claim.</span>
          </h1>
          <p className="hero-subtitle">
            A blockchain trust registry where institutions issue digitally signed
            credentials with verifiable evidence integrity and real-time drift detection —
            tamper-evident, consensus-validated, instantly verifiable.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/verify')}>
              Verify a Credential
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('/dashboard')}>
              Explore Issuer Portal
            </button>
          </div>
        </motion.div>

        <motion.div
          className="hero-chain-preview"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <PreviewChain />
        </motion.div>
      </section>

      {/* ---------- PROBLEM STATEMENT ---------- */}
      <Section eyebrow="The Problem" title="Claims without evidence are hollow. Verification is slow and manual.">
        <div className="problem-grid">
          <ProblemCard
            icon="✕"
            title="Evidence Tampering & Drift"
            text="Supporting artifacts, project repos, and evaluator notes can mutate silently after credential issuance without detection."
          />
          <ProblemCard
            icon="⏱"
            title="Slow Manual Verification"
            text="Recruiters and institutions must call or email issuing bodies and wait days for manual record confirmations."
          />
          <ProblemCard
            icon="⚠"
            title="No Single Source of Truth"
            text="Records live in disconnected silos — PDFs, registrar tables, and photocopies — each editable independently."
          />
        </div>
      </Section>

      {/* ---------- ARCHITECTURE LAYERS ---------- */}
      <Section eyebrow="The Architecture" title="Evidence-backed trust, built in four layers.">
        <div className="layer-stack">
          <LayerRow
            num="01"
            title="Evidence & Data Layer"
            text="Captures SHA-256 fingerprints of supporting artifacts in a deterministic manifest, anchored to Merkle tree blocks."
          />
          <LayerRow
            num="02"
            title="Security & Signature Layer"
            text="Authorized issuers sign canonical credential payloads with RSA-2048 keys. Anyone can verify mathematical authenticity."
          />
          <LayerRow
            num="03"
            title="Consensus Layer"
            text="Proof-of-Authority: trusted registrar nodes vote to seal each batch of credentials into immutable blocks."
          />
          <LayerRow
            num="04"
            title="Verification & Drift Engine"
            text="Answers 5 independent security questions — reporting issuer authorization, signature validity, and evidence drift in real time."
          />
        </div>
      </Section>

      {/* ---------- WHY POA NOT POW ---------- */}
      <Section eyebrow="Design Justification" title="Why Proof-of-Authority, not Proof-of-Work?">
        <div className="compare-grid">
          <div className="compare-card compare-card-out">
            <div className="compare-label">Proof-of-Work (Bitcoin-style)</div>
            <ul>
              <li>Built for public, trustless, anonymous networks</li>
              <li>Needs expensive computation to deter spam attacks</li>
              <li>Slow block times, high energy cost</li>
              <li>Overkill when participants are already known</li>
            </ul>
          </div>
          <div className="compare-card compare-card-in">
            <div className="compare-label">Proof-of-Authority (SkillLedger)</div>
            <ul>
              <li>Fits a <strong>permissioned</strong> network of known registrars</li>
              <li>No wasted computation — fast, majority-vote sealing</li>
              <li>Mirrors real consortium chains (Hyperledger Fabric)</li>
              <li>Validator identity itself is the trust mechanism</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ---------- TAMPER & DRIFT EVIDENCE ---------- */}
      <Section eyebrow="Tamper & Drift Detection" title="Detect tampering and evidence drift in real time.">
        <p className="section-lead">
          Corrupt a block directly or alter supporting project evidence — SkillLedger
          distinguishes between valid signatures with drifted evidence versus outright forgery.
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/tamper')}>
          Try Tamper & Drift Demo →
        </button>
      </Section>

      <footer className="landing-footer">
        <span>SkillLedger — Proof Behind Every Professional Claim</span>
        <span>Evidence-Backed Blockchain Credential Verification</span>
      </footer>
    </div>
  );
}

function Section({ eyebrow, title, children }) {
  return (
    <motion.section
      className="landing-section"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
    >
      <div className="section-eyebrow">{eyebrow}</div>
      <h2 className="section-title">{title}</h2>
      {children}
    </motion.section>
  );
}

function ProblemCard({ icon, title, text }) {
  return (
    <div className="problem-card">
      <div className="problem-icon">{icon}</div>
      <div className="problem-title">{title}</div>
      <div className="problem-text">{text}</div>
    </div>
  );
}

function LayerRow({ num, title, text }) {
  return (
    <div className="layer-row">
      <div className="layer-num">{num}</div>
      <div className="layer-body">
        <div className="layer-title">{title}</div>
        <div className="layer-text">{text}</div>
      </div>
    </div>
  );
}

function PreviewChain() {
  const blocks = [0, 1, 2, 3];
  return (
    <div className="preview-chain">
      {blocks.map((b, i) => (
        <div className="preview-chain-item" key={b}>
          {i > 0 && <div className="preview-link" />}
          <div className="preview-block">
            <div className="preview-block-label">{b === 0 ? 'GENESIS' : `BLOCK #${b}`}</div>
            <div className="preview-block-hash">0x{(b + 1).toString(16).repeat(8)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}