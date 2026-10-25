"""
app.py
-------
Flask JSON REST API for SkillLedger — Proof Behind Every Professional Claim.

Evidence-Backed Professional Credentials with Blockchain Verification,
Trust Registry, PoA Consensus, and Real-Time Evidence Drift Detection.
"""

import time
from flask import Flask, jsonify, request
from flask_cors import CORS

from blockchain_core import Blockchain
from crypto_utils import Authority, verify_signature, build_evidence_manifest, sha256_hash, canonical_json, format_w3c_verifiable_credential
from consensus import PoAConsensus
from trust_registry import TrustRegistry

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}})

blockchain = Blockchain()
university = Authority("State University Registrar Office", "INST-001")
trust_registry = TrustRegistry()
poa = PoAConsensus(["RegistrarNode-A", "RegistrarNode-B", "RegistrarNode-C"])

pending_credentials = []


def seed_initial_demo_credential():
    """Seeds Block #1 with a realistic demo credential and supporting evidence."""
    sample_cert_id = "CERT-2026-001"
    if blockchain.find_credential(sample_cert_id):
        return

    evidence_items = [
        {
            "id": "EVID-001",
            "title": "Capstone Project Repository",
            "type": "code_repository",
            "source_url": "https://github.com/asharao/blockchain-verifier",
            "content": "commit 4a8f9b2: Initial smart contract & consensus implementation. PR #12 approved by evaluator.",
            "provenance": "AUTHENTICATED_SOURCE",
        },
        {
            "id": "EVID-002",
            "title": "Faculty Assessment & Defense Report",
            "type": "assessment_report",
            "source_url": "https://eval.state.edu/reports/2026/asha-rao-final.pdf",
            "content": "Final Assessment: Grade A+ (98/100). Signed and attested by Prof. H. Vance.",
            "provenance": "AUTHENTICATED_SOURCE",
        }
    ]

    processed_evidence, manifest, manifest_hash = build_evidence_manifest(evidence_items)

    sample_cred = {
        "certificate_id": sample_cert_id,
        "student_name": "Asha Rao",
        "course": "Distributed Systems & Blockchain Architecture",
        "grade": "A+",
        "year": "2026",
        "category": "Professional Skills",
        "issuer": university.name,
        "issuer_id": university.institution_id,
        "evidence_manifest_hash": manifest_hash,
        "evidence_manifest": manifest,
        "evidence_items": processed_evidence,
        "issued_at": time.time() - 86400,
        "status": "ACTIVE",
    }

    sample_cred["signature"] = university.sign_payload(sample_cred)

    # Seal directly into Block #1 via PoA consensus
    blockchain.add_block([sample_cred], validator="RegistrarNode-A")


# Run initial seeding
seed_initial_demo_credential()


def ok(data=None, message=None, status=200):
    body = {"success": True}
    if message is not None:
        body["message"] = message
    if data is not None:
        body["data"] = data
    return jsonify(body), status


def err(message, status=400):
    return jsonify({"success": False, "error": message}), status


@app.route("/api/health")
def health():
    return ok({
        "status": "up",
        "platform": "SkillLedger",
        "tagline": "Proof Behind Every Professional Claim",
        "chain_length": len(blockchain.chain),
        "consensus": "Proof of Authority (PoA)",
        "features": [
            "Trust Registry",
            "RSA-2048 Digital Signatures",
            "Evidence Integrity & Drift Detection",
            "On-Chain Merkle Tree Batching",
            "Credential Revocation Engine",
        ]
    })


@app.route("/api/institutions")
def get_institutions():
    return ok({"institutions": trust_registry.get_all_institutions()})


@app.route("/api/institutions/register", methods=["POST"])
def register_institution():
    """
    Registers a new institution in the decentralized Trust Registry.
    Enforces identity registration and records an on-chain audit event.
    """
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    category = (payload.get("category") or "Academic & Professional Skills").strip()
    authorized_categories = payload.get("authorized_categories") or ["Academic", "Professional Skills", "Internship", "Engineering"]

    if not name:
        return err("Institution name is required.", status=422)

    existing = next((i for i in trust_registry.get_all_institutions() if i["name"].lower() == name.lower()), None)
    if existing:
        return err(f"Institution '{name}' is already registered in the Trust Registry.", status=409)

    new_id = f"INST-{len(trust_registry.institutions) + 1:03d}"
    inst = trust_registry.register_institution(
        institution_id=new_id,
        name=name,
        category=category,
        authorized_categories=authorized_categories
    )

    blockchain._record_audit_event(
        event_type="INSTITUTION_REGISTERED",
        actor=name,
        certificate_id=new_id,
        details=f"New institution registered: {name} (ID: {new_id}, DID: {inst.did})",
    )

    return ok(
        {"institution": {**inst.to_dict(), "authorized_categories": authorized_categories}},
        message=f"Institution '{name}' registered in Trust Registry with DID {inst.did}.",
        status=201
    )



@app.route("/api/chain")
def api_chain():
    chain_data = blockchain.to_dict_list()
    is_valid, message = blockchain.is_chain_valid()
    return ok({
        "chain": chain_data,
        "length": len(blockchain.chain),
        "is_valid": is_valid,
        "validity_message": message,
        "pending_count": len(pending_credentials),
        "validators": poa.get_status(),
        "audit_events": blockchain.get_audit_events(),
    })


@app.route("/api/chain/validity")
def chain_validity():
    is_valid, message = blockchain.is_chain_valid()
    return ok({"is_valid": is_valid, "message": message})


@app.route("/api/pending")
def get_pending():
    return ok({"pending": pending_credentials, "count": len(pending_credentials)})


@app.route("/api/issue", methods=["POST"])
def issue_credential():
    payload = request.get_json(silent=True) or {}

    certificate_id = (payload.get("certificate_id") or "").strip()
    student_name = (payload.get("student_name") or "").strip()
    course = (payload.get("course") or "").strip()
    grade = (payload.get("grade") or "").strip()
    year = (payload.get("year") or "").strip()
    category = (payload.get("category") or "Professional Skills").strip()
    issuer_name = (payload.get("issuer") or university.name).strip()

    missing = [
        field for field, value in [
            ("certificate_id", certificate_id),
            ("student_name", student_name),
            ("course", course),
            ("grade", grade),
            ("year", year),
        ] if not value
    ]
    if missing:
        return err(f"Missing required field(s): {', '.join(missing)}", status=422)

    # Trust Registry check: Is issuer authorized to issue in this category?
    is_auth, auth_msg = trust_registry.is_issuer_authorized(issuer_name, category)
    if not is_auth:
        return err(f"Issuance rejected: {auth_msg}", status=403)

    if blockchain.find_credential(certificate_id):
        return err(f"Certificate ID '{certificate_id}' already exists in the sealed chain.", status=409)
    if any(c["certificate_id"] == certificate_id for c in pending_credentials):
        return err(f"Certificate ID '{certificate_id}' is already pending in this batch.", status=409)

    # Process evidence items
    evidence_items = payload.get("evidence_items") or []
    # If no evidence items provided, add a default reference from course data
    if not evidence_items:
        evidence_items = [{
            "id": "EVID-001",
            "title": f"Course & Project Assessment - {course}",
            "type": "assessment_report",
            "source_url": f"https://registry.skillledger.org/records/{certificate_id}",
            "content": f"Verified completion for {student_name} with grade {grade} ({year}).",
            "provenance": "MANUAL_ENTRY",
        }]

    processed_evidence, manifest, manifest_hash = build_evidence_manifest(evidence_items)

    credential = {
        "certificate_id": certificate_id,
        "student_name": student_name,
        "course": course,
        "grade": grade,
        "year": year,
        "category": category,
        "issuer": issuer_name,
        "issuer_id": university.institution_id,
        "evidence_manifest_hash": manifest_hash,
        "evidence_manifest": manifest,
        "evidence_items": processed_evidence,
        "issued_at": time.time(),
        "status": "ACTIVE",
    }

    # Digital signature of canonical payload excluding 'signature' field
    signature = university.sign_payload(credential)
    credential["signature"] = signature

    pending_credentials.append(credential)

    return ok(
        {"credential": credential, "pending_count": len(pending_credentials)},
        message=f"Credential for {student_name} (ID: {certificate_id}) signed with evidence manifest hash {manifest_hash[:16]}… and added to pending batch.",
        status=201,
    )


@app.route("/api/seal-block", methods=["POST"])
def seal_block():
    global pending_credentials

    if not pending_credentials:
        return err("No pending credentials to seal into a block.", status=400)

    approved, votes, validator = poa.reach_consensus(pending_credentials)

    if approved:
        new_block = blockchain.add_block(pending_credentials.copy(), validator)
        sealed_count = len(pending_credentials)
        pending_credentials = []
        return ok(
            {
                "block": new_block.to_dict(),
                "votes": votes,
                "validator": validator,
                "sealed_count": sealed_count,
            },
            message=f"Consensus reached! Block #{new_block.index} sealed by {validator}.",
            status=201,
        )
    else:
        return err(
            "PoA consensus FAILED — not enough validator nodes online/approved.",
            status=409,
        )


@app.route("/api/verify/<certificate_id>")
def verify_credential(certificate_id):
    """
    SkillLedger Multi-Check Verification Engine.
    Answers the 5 core questions:
        1. Is the credential signed by an authorized issuer?
        2. Has the credential itself been modified?
        3. Does the supporting evidence match the evidence originally recorded?
        4. Is the credential currently active or revoked?
        5. Which checks passed, failed, or could not be completed?
    """
    found = blockchain.find_credential(certificate_id)

    if not found:
        return ok({"found": False}, status=200)

    cred = found["credential"].copy()
    signature = cred.get("signature")
    issuer_name = cred.get("issuer", university.name)
    category = cred.get("category", "Professional Skills")
    revocation = found.get("revocation")
    is_revoked = revocation is not None or cred.get("status") == "REVOKED"

    # Check 1: Issuer identity and authorization in Trust Registry
    issuer_auth_ok, issuer_auth_msg = trust_registry.is_issuer_authorized(issuer_name, category)
    check_issuer = {
        "passed": issuer_auth_ok,
        "issuer_name": issuer_name,
        "category": category,
        "status": "ACTIVE" if issuer_auth_ok else "UNAUTHORIZED",
        "details": issuer_auth_msg,
    }

    # Check 2: Digital Signature validity
    sig_valid = verify_signature(cred, signature, university.public_key) if signature else False
    check_signature = {
        "passed": sig_valid,
        "algorithm": "RSA-2048-PSS-SHA256",
        "key_fingerprint": sha256_hash(university.get_public_key_pem())[:16],
        "details": "Cryptographic signature is valid and authentic." if sig_valid else "Signature verification failed — payload or signature mismatch.",
    }

    # Check 3: Credential Integrity (Merkle Root & Chain link)
    block_index = found["block_index"]
    target_block = blockchain.chain[block_index] if block_index < len(blockchain.chain) else None
    block_valid = target_block is not None and (target_block.hash == target_block.compute_hash())
    check_integrity = {
        "passed": block_valid and sig_valid,
        "block_index": block_index,
        "merkle_root": target_block.merkle_root if target_block else None,
        "details": "Credential payload matches block Merkle root and has not been altered." if block_valid else "Block hash mismatch — tamper detected in chain record.",
    }

    # Check 4: Evidence Integrity and Drift Detection
    evidence_items = cred.get("evidence_items") or []
    item_results = []
    has_modified = False
    has_unavailable = False

    for item in evidence_items:
        current_status = item.get("status", "UNCHANGED")
        orig_fp = item.get("original_fingerprint")
        curr_content = item.get("current_content", item.get("original_content", ""))
        recomputed_fp = sha256_hash(curr_content)

        if current_status == "UNAVAILABLE":
            has_unavailable = True
            eval_status = "UNAVAILABLE"
        elif current_status == "MODIFIED" or recomputed_fp != orig_fp:
            has_modified = True
            eval_status = "MODIFIED"
        else:
            eval_status = "UNCHANGED"

        item_results.append({
            "id": item.get("id"),
            "title": item.get("title"),
            "type": item.get("type"),
            "source_url": item.get("source_url"),
            "original_fingerprint": orig_fp,
            "current_fingerprint": recomputed_fp if eval_status != "UNAVAILABLE" else "UNAVAILABLE",
            "status": eval_status,
            "provenance": item.get("provenance", "MANUAL_ENTRY"),
        })

    if has_modified:
        evidence_overall_status = "MODIFIED"
        evidence_passed = False
        evidence_details = "Evidence Drift Detected: supporting evidence differs from the version recorded at issuance."
    elif has_unavailable:
        evidence_overall_status = "UNAVAILABLE"
        evidence_passed = False
        evidence_details = "Evidence Source Inaccessible: one or more evidence references could not be verified."
    elif not evidence_items:
        evidence_overall_status = "NOT_CHECKED"
        evidence_passed = True
        evidence_details = "No external evidence references recorded for this credential."
    else:
        evidence_overall_status = "UNCHANGED"
        evidence_passed = True
        evidence_details = "All evidence items match the cryptographic fingerprints recorded in the anchored manifest."

    check_evidence = {
        "passed": evidence_passed,
        "status": evidence_overall_status,
        "anchored_manifest_hash": cred.get("evidence_manifest_hash"),
        "items_checked": len(item_results),
        "items": item_results,
        "details": evidence_details,
    }

    # Check 5: Credential Status (Active vs Revoked vs Expired)
    check_status = {
        "passed": not is_revoked,
        "status": "REVOKED" if is_revoked else "ACTIVE",
        "revocation_reason": revocation.get("reason") if revocation else None,
        "revoked_at": revocation.get("revoked_at") if revocation else None,
        "revoked_by": revocation.get("revoked_by") if revocation else None,
        "details": f"Revoked on ledger: {revocation.get('reason')}" if is_revoked else "Credential is active and in good standing.",
    }

    # Deterministic overall outcome precedence
    if is_revoked:
        overall_outcome = "REVOKED"
        overall_summary = "CREDENTIAL REVOKED — The issuing authority has revoked this credential. Historical issuance record remains intact."
    elif not sig_valid or not block_valid or not issuer_auth_ok:
        overall_outcome = "INVALID"
        overall_summary = "INVALID CREDENTIAL — Digital signature, authorization, or payload integrity checks failed."
    elif evidence_overall_status == "MODIFIED":
        overall_outcome = "MODIFIED_EVIDENCE"
        overall_summary = "EVIDENCE DRIFT DETECTED — The credential signature and issuer authorization are valid, but supporting evidence differs from the attested version."
    elif evidence_overall_status == "UNAVAILABLE":
        overall_outcome = "INCOMPLETE"
        overall_summary = "VERIFICATION INCOMPLETE — Core signature is authentic, but external evidence sources could not be reached."
    else:
        overall_outcome = "VERIFIED"
        overall_summary = "VERIFIED — All checks passed: authorized issuer, valid signature, intact chain integrity, and evidence matches recorded fingerprints."

    return ok({
        "found": True,
        "overall_status": overall_outcome,
        "overall_summary": overall_summary,
        "checks": {
            "issuer_authorized": check_issuer,
            "signature_valid": check_signature,
            "credential_integrity": check_integrity,
            "evidence_integrity": check_evidence,
            "credential_status": check_status,
        },
        "block_index": found["block_index"],
        "block_hash": found["block_hash"],
        "credential": found["credential"],
        "w3c_verifiable_credential": format_w3c_verifiable_credential(found["credential"]),
        "share_url": f"/verify?certId={certificate_id}",
    })


@app.route("/api/credentials/<certificate_id>/revoke", methods=["POST"])
def revoke_credential(certificate_id):
    """Revokes a credential with an explicit reason from an authorized issuer."""
    payload = request.get_json(silent=True) or {}
    reason = (payload.get("reason") or "Administrative revocation").strip()
    issuer_name = (payload.get("issuer") or university.name).strip()

    success, message = blockchain.revoke_credential(certificate_id, reason, issuer_name)
    if not success:
        return err(message, status=400)

    return ok({"certificate_id": certificate_id, "reason": reason, "status": "REVOKED"}, message=message)


@app.route("/api/demo/tamper-evidence", methods=["POST"])
def demo_tamper_evidence():
    """Simulates Evidence Drift on a credential (Test 5)."""
    payload = request.get_json(silent=True) or {}
    cert_id = payload.get("certificate_id") or "CERT-2026-001"
    altered_content = payload.get("altered_content") or "MODIFIED commit hash: 9a8c7b6 — source code modified after credential attestation."

    success, message = blockchain.tamper_evidence(cert_id, altered_content)
    if not success:
        return err(message, status=400)

    return ok({"certificate_id": cert_id, "evidence_status": "MODIFIED"}, message=message)


@app.route("/api/demo/make-unavailable", methods=["POST"])
def demo_make_unavailable():
    """Simulates Evidence Unavailable on a credential (Test 6)."""
    payload = request.get_json(silent=True) or {}
    cert_id = payload.get("certificate_id") or "CERT-2026-001"

    success, message = blockchain.make_evidence_unavailable(cert_id)
    if not success:
        return err(message, status=400)

    return ok({"certificate_id": cert_id, "evidence_status": "UNAVAILABLE"}, message=message)


@app.route("/api/demo/reset-evidence", methods=["POST"])
def demo_reset_evidence():
    """Restores evidence back to original fingerprints."""
    payload = request.get_json(silent=True) or {}
    cert_id = payload.get("certificate_id") or "CERT-2026-001"

    success, message = blockchain.reset_evidence(cert_id)
    if not success:
        return err(message, status=400)

    return ok({"certificate_id": cert_id, "evidence_status": "UNCHANGED"}, message=message)


@app.route("/api/tamper-demo", methods=["POST"])
def tamper_demo():
    """Simulates raw block data tampering (Test 2: Block integrity check failure)."""
    if len(blockchain.chain) <= 1:
        return err("Need at least one real block before running the tamper demo. Issue and seal a credential first.", status=400)

    fake = {
        "certificate_id": "FAKE-9999",
        "student_name": "Attacker Inserted Record",
        "course": "N/A",
        "grade": "A+",
        "year": "2099",
        "issuer": "UNKNOWN",
    }
    blockchain.tamper_block(1, fake)

    is_valid, validity_message = blockchain.is_chain_valid()

    return ok(
        {
            "tampered_block_index": 1,
            "is_valid": is_valid,
            "validity_message": validity_message,
            "chain": blockchain.to_dict_list(),
        },
        message="Block #1 was just tampered with directly (bypassing consensus & signatures).",
    )


@app.route("/api/demo/unauthorized-issuer", methods=["POST"])
def demo_unauthorized_issuer():
    """
    Simulates an unregistered / unauthorized rogue entity attempting to issue a credential.
    Demonstrates mandatory MVP rejection criteria (HTTP 403 Forbidden).
    """
    payload = request.get_json(silent=True) or {}
    rogue_name = (payload.get("rogue_name") or "Rogue Unaccredited Academy").strip()
    category = (payload.get("category") or "Academic").strip()

    is_auth, auth_msg = trust_registry.is_issuer_authorized(rogue_name, category)

    blockchain._record_audit_event(
        event_type="UNAUTHORIZED_ISSUANCE_BLOCKED",
        actor=rogue_name,
        certificate_id="BLOCKED_ATTEMPT",
        details=f"Trust Registry Enforcement: Blocked unauthorized issuance attempt by unregistered entity '{rogue_name}' for category '{category}'.",
    )

    return err(
        f"REJECTED (403 Forbidden): Issuer '{rogue_name}' is not registered or authorized in the decentralized Trust Registry for category '{category}'. Blockchain smart contract policy rejected record issuance.",
        status=403
    )


@app.route("/api/reset", methods=["POST"])
def reset_chain():
    """Wipe state back to fresh genesis chain and seed sample demo credential."""
    global blockchain, pending_credentials
    blockchain = Blockchain()
    pending_credentials = []
    seed_initial_demo_credential()
    return ok({"chain": blockchain.to_dict_list()}, message="SkillLedger chain reset to initial state with demo credentials.")


@app.route("/api/validators")
def get_validators():
    return ok({"validators": poa.get_status()})


@app.route("/api/validators/<int:node_id>/toggle", methods=["POST"])
def toggle_validator(node_id):
    current = next((n for n in poa.get_status() if n["node_id"] == node_id), None)
    if not current:
        return err(f"No validator node with id {node_id}.", status=404)

    poa.set_node_status(node_id, not current["online"])
    return ok({"validators": poa.get_status()})


@app.route("/api/audit")
def get_audit():
    return ok({"audit_events": blockchain.get_audit_events()})


import github_code_analyzer

@app.route("/api/skills/github-verify", methods=["POST"])
def verify_github_skills():
    """
    Skill & GitHub Validator:
    Deep static code analysis and context verification across public GitHub repositories.
    Inspects language composition, file trees, dependencies (e.g. YOLOv8 / Ultralytics, PyTorch, OpenCV),
    and imports to assess practical implementation vs theory-only certificates.
    """
    payload = request.get_json(silent=True) or {}
    username = (payload.get("github_username") or "").strip()
    claimed_skill = (payload.get("claimed_skill") or "Python & AI/ML").strip()
    cert_title = (payload.get("certificate_title") or "").strip()

    if not username:
        return err("GitHub username is required.", status=422)

    result = github_code_analyzer.analyze_github_user_and_skills(username, claimed_skill, cert_title)
    return ok(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)