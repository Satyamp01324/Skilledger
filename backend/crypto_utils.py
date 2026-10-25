"""
crypto_utils.py
----------------
Cryptographic and evidence-hashing utilities for SkillLedger.

Includes:
    - Canonical JSON serialization (deterministic, sorted keys, no whitespace variance)
    - SHA-256 fingerprinting for evidence and payload integrity
    - Evidence manifest generation with deterministic root hashing
    - RSA-2048 digital signatures for credential issuance and verification
"""

import hashlib
import json
import time
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature


def canonical_json(obj) -> str:
    """Produces deterministic canonical JSON serialization for hashing and signing."""
    return json.dumps(obj, sort_keys=True, separators=(',', ':'))


def sha256_hash(data: str) -> str:
    """Computes SHA-256 hex digest of a UTF-8 string."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def build_evidence_manifest(evidence_items: list) -> tuple[list, dict, str]:
    """
    Takes a list of evidence items:
    [{ 'id': 'EVID-001', 'title': '...', 'type': 'code_repository', 'source_url': '...', 'content': '...' }]

    Computes deterministic fingerprints for each item, creates a canonical manifest,
    and returns: (processed_items, canonical_manifest, manifest_hash).
    """
    processed_items = []
    canonical_items = []

    for idx, item in enumerate(evidence_items or []):
        item_id = item.get("id") or f"EVID-{idx+1:03d}"
        title = (item.get("title") or "Evidence Item").strip()
        etype = (item.get("type") or "project_report").strip()
        source_url = (item.get("source_url") or "").strip()
        content = (item.get("content") or "").strip() or source_url or title
        provenance = item.get("provenance") or ("MANUAL_ENTRY" if not item.get("authenticated_source") else "AUTHENTICATED_SOURCE")

        fingerprint = sha256_hash(content)

        processed = {
            "id": item_id,
            "title": title,
            "type": etype,
            "source_url": source_url,
            "original_content": content,
            "current_content": content,
            "original_fingerprint": fingerprint,
            "current_fingerprint": fingerprint,
            "status": "UNCHANGED",
            "provenance": provenance,
            "captured_at": item.get("captured_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "access_policy": item.get("access_policy", "PUBLIC_REFERENCE"),
        }
        processed_items.append(processed)

        # Deterministic representation for manifest anchoring
        canonical_items.append({
            "id": item_id,
            "title": title,
            "type": etype,
            "source_url": source_url,
            "fingerprint": fingerprint,
            "provenance": provenance,
        })

    manifest = {
        "manifest_version": "1.0",
        "item_count": len(canonical_items),
        "items": canonical_items,
    }
    manifest_hash = sha256_hash(canonical_json(manifest)) if canonical_items else sha256_hash("EMPTY_MANIFEST")

    return processed_items, manifest, manifest_hash


def extract_signed_fields(payload: dict) -> dict:
    """
    Extracts the immutable credential fields that are cryptographically signed.
    Binding evidence_manifest_hash securely binds all evidence to the signature
    without coupling the signature to mutable external evidence bytes.
    """
    keys = [
        "certificate_id",
        "student_name",
        "course",
        "grade",
        "year",
        "category",
        "issuer",
        "issuer_id",
        "evidence_manifest_hash",
        "issued_at",
    ]
    return {k: payload[k] for k in keys if k in payload}


class Authority:
    """
    Represents an authorized credential-issuing authority (e.g., University or Certified Institution).
    Generates its own RSA key pair on creation or loads from private key.
    """

    def __init__(self, name: str, institution_id: str = "INST-001"):
        self.name = name
        self.institution_id = institution_id
        self.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.public_key = self.private_key.public_key()

    def sign_payload(self, payload: dict) -> str:
        """
        Signs the canonical representation of the immutable credential fields
        using RSA-PSS with SHA-256. Returns signature as hex string.
        """
        signed_fields = extract_signed_fields(payload)
        message = canonical_json(signed_fields).encode('utf-8')
        signature = self.private_key.sign(
            message,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
        return signature.hex()

    def sign_credential(self, credential: dict) -> str:
        """Backwards-compatible wrapper for sign_payload."""
        return self.sign_payload(credential)

    def get_public_key_pem(self) -> str:
        """Returns the public key in PEM format."""
        pem = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        return pem.decode()


def verify_signature(credential: dict, signature_hex: str, public_key) -> bool:
    """
    Verifies that the credential's signed fields match the RSA signature from public_key.
    """
    if not signature_hex or not public_key:
        return False
    try:
        signed_fields = extract_signed_fields(credential)
        message = canonical_json(signed_fields).encode('utf-8')
        signature = bytes.fromhex(signature_hex)
        public_key.verify(
            signature,
            message,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False