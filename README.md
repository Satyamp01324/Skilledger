# ⛓ SkillLedger — Proof Behind Every Professional Claim

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Backend](https://img.shields.io/badge/backend-Flask%20%2B%20Python-blue)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61dafb)
![Consensus](https://img.shields.io/badge/consensus-Proof%20of%20Authority-green)
![Crypto](https://img.shields.io/badge/crypto-RSA--2048%20%2B%20SHA--256-orange)
![Differentiator](https://img.shields.io/badge/innovation-Evidence%20Drift%20Detection-purple)

> **SkillLedger** is an evidence-backed credential verification platform with a blockchain trust registry, Proof-of-Authority consensus, and real-time **Evidence Integrity and Drift Detection**.

---

## 🎯 The Five Core Verification Questions

SkillLedger never displays a generic single "Verified" badge when checks have failed or are incomplete. Every verification independently evaluates:

1. **Is the credential signed by an authorized issuer?** (Trust Registry verification)
2. **Has the credential payload itself been modified?** (RSA-2048-PSS signature verification over canonical JSON)
3. **Does the supporting evidence match the version originally attested to?** (SHA-256 evidence manifest drift detection: `UNCHANGED`, `MODIFIED`, `UNAVAILABLE`)
4. **Is the credential currently active or revoked?** (On-chain status, preservation of audit history with revocation reasons)
5. **Which checks passed, failed, or remain unknown?** (Transparent 5-point report breakdown)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                         │
│       React 19 Frontend  ←→  Flask REST API (Port 5000)         │
│       (Dashboard · Issuance · 5-Check Verifier · Audit)         │
├─────────────────────────────────────────────────────────────────┤
│                   EVIDENCE INTEGRITY LAYER                      │
│       Deterministic Evidence Manifest (SHA-256 Fingerprints)    │
│       Real-Time Drift Scanner (UNCHANGED / MODIFIED)            │
├─────────────────────────────────────────────────────────────────┤
│                     SECURITY & TRUST LAYER                      │
│       Trust Registry (Institutions & Category Permissions)       │
│       RSA-2048 Digital Signatures (Canonical JSON)              │
│       Credential Revocation Engine with Reason Audit            │
├─────────────────────────────────────────────────────────────────┤
│                      CONSENSUS LAYER                            │
│       Proof-of-Authority (PoA) — 3 Trusted Validator Nodes      │
│       Majority vote required to seal each block                 │
├─────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                               │
│       Block → MerkleTree → Blockchain                           │
│       Each block stores a Merkle root of batched credentials    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
skillledger/
├── backend/
│   ├── app.py              # Flask REST API (16 routes including drift & revocation)
│   ├── blockchain_core.py  # Block, MerkleTree, Blockchain, Revocations, Audit Logs
│   ├── crypto_utils.py     # Canonical serialization, SHA-256 evidence hashing, RSA-2048
│   ├── trust_registry.py   # Registered institutions and category authorization rules
│   ├── consensus.py        # PoA validator nodes + majority voting
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── api/client.js       # Axios API wrapper with local fallback
    │   ├── components/         # Sidebar, Toast
    │   └── pages/
    │       ├── Landing.jsx         # Hero, value proposition & architecture
    │       ├── Dashboard.jsx       # Real-time ledger status & validator toggles
    │       ├── IssueCredential.jsx # Structured issuance wizard with evidence manifest
    │       ├── VerifyCredential.jsx# 5-point verification, evidence drift, share link & QR
    │       ├── ChainVisualization.jsx # Animated block track & tamper link inspection
    │       ├── TamperDemo.jsx      # Interactive tests for drift, block tampering & reset
    │       └── AuditExplorer.jsx   # Searchable immutable audit event explorer
    └── vite.config.js
```

---

## 🚀 Running Locally

### 1. Backend (Python 3.10+)

```bash
cd backend

# On Windows:
py app.py

# On macOS/Linux:
python3 app.py
```
> The API will start on **http://localhost:5000** with pre-seeded demo credential `CERT-2026-001`.

### 2. Frontend (Node.js 18+)

```bash
cd frontend
npm install
npm run dev
```
> The application will open on **http://localhost:3000**.

---

## 🧪 Demonstration Guide (The 8 Mandatory Scenarios)

### Test 1 — Valid Credential Verification
1. Navigate to **Verify Credential** (`/verify`).
2. Search for pre-seeded credential: `CERT-2026-001`.
3. **Expected Result:** Shows green banner `✓ VERIFIED — Authentic & Evidence Intact`. All 5 checks pass (Authorized Issuer, Signature Valid, Chain Integrity, Evidence Unchanged, Active Status).

### Test 2 — Direct Block Storage Tampering
1. Navigate to **Tamper & Drift Demo** (`/tamper`).
2. Under Scenario B, click **"Tamper With Block #1"**.
3. Navigate to **Chain Visualization** (`/chain`).
4. **Expected Result:** Link breaks visually in red with `✕`. Hash mismatch detected immediately without consensus approval.

### Test 3 — Unauthorized Issuer Rejection
1. Navigate to **Issue Credential** (`/issue`).
2. Attempt issuing with an unregistered issuer or unauthorized category (via API: `POST /api/issue` with `'issuer': 'Fake Academy'`).
3. **Expected Result:** The operation is rejected with `403 Forbidden` (`Issuer 'Fake Academy' is not registered in the trust registry`).

### Test 4 — Credential Revocation
1. On `/verify?certId=CERT-2026-001`, click **"⚠ Revoke Credential"**.
2. Enter reason: `Honor code violation during capstone defense` and confirm.
3. Re-verify `CERT-2026-001`.
4. **Expected Result:** Overall status is `REVOKED`. The banner is red. The revocation reason and timestamp are displayed. The cryptographic signature is acknowledged as authentic, but status is revoked.

### Test 5 — Evidence Drift Detection (Core Innovation!)
1. Navigate to **Tamper & Drift Demo** (`/tamper`).
2. Under Scenario A, click **"Simulate Evidence Drift (Test 5)"**.
3. Click **"Verify CERT-2026-001 to View Report"**.
4. **Expected Result:** Overall outcome is `MODIFIED_EVIDENCE` (amber banner).
   - Signature Check: **PASSED** (mathematically authentic).
   - Evidence Integrity: **FAILED / MODIFIED** (original fingerprint vs drifted fingerprint displayed with clear human explanation).

### Test 6 — Inaccessible / Unavailable Evidence
1. On `/tamper`, click **"Simulate Inaccessible Source (Test 6)"**.
2. Verify `CERT-2026-001`.
3. **Expected Result:** Overall outcome is `INCOMPLETE`. Evidence status reports `UNAVAILABLE` without falsely accusing the student of tampering.

### Test 7 — Unauthorized Revocation Rejection
1. Any revocation attempt specifying a non-existent credential or unauthorized party is rejected by the backend validation layer.

### Test 8 — Controlled Sharing & Privacy
1. On `/verify?certId=CERT-2026-001`, click **"🔗 Share Verification Link & QR"**.
2. **Expected Result:** A shareable link and SVG QR code are generated. No private keys, passwords, or personal databases are leaked in public URLs.

---

## 🔌 API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Liveness check and SkillLedger platform info |
| GET | `/api/chain` | Full block chain, validity, and validator state |
| GET | `/api/institutions` | Trust Registry institutions and authorized categories |
| POST | `/api/issue` | Sign and queue structured credential with evidence manifest |
| POST | `/api/seal-block` | Run PoA consensus and seal pending batch into block |
| GET | `/api/verify/<id>` | Full 5-check verification engine report |
| POST | `/api/credentials/<id>/revoke` | Revoke a credential with authorized reason |
| POST | `/api/demo/tamper-evidence` | Mutate evidence to simulate drift (Test 5) |
| POST | `/api/demo/make-unavailable` | Mark evidence inaccessible (Test 6) |
| POST | `/api/demo/reset-evidence` | Restore pristine evidence fingerprints |
| POST | `/api/tamper-demo` | Corrupt block #1 in storage (Test 2) |
| POST | `/api/reset` | Reset ledger to genesis and seed demo credentials |
| GET | `/api/audit` | Retrieve immutable audit event explorer logs |
| GET | `/api/validators` | List validator nodes |
| POST | `/api/validators/<id>/toggle` | Toggle validator node online/offline |

---

## 🔒 Security Principles

- **Off-Chain Privacy:** Complete transcripts, personal files, and private evidence remain off-chain. Only cryptographic fingerprints (SHA-256) and minimal references are stored on the ledger.
- **Deterministic Manifests:** Canonical JSON serialization (`sort_keys=True, separators=(',', ':')`) prevents whitespace tampering from affecting hash calculations.
- **Role-Based Trust Registry:** Only registered institutions and authorized keys can issue or revoke credentials for assigned categories.