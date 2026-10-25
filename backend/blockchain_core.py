"""
blockchain_core.py
------------------
Core blockchain data structures for SkillLedger.

Contains:
    - MerkleTree   : Batches credentials into a single root hash per block
    - Block        : A single block in the chain storing Merkle root and audit metadata
    - Blockchain   : The chain itself, with validation, tamper detection, revocations, and audit logs
"""

import hashlib
import json
import time
from crypto_utils import canonical_json, sha256_hash


# ---------------------------------------------------------------------------
# MERKLE TREE
# ---------------------------------------------------------------------------
class MerkleTree:
    """
    Builds a Merkle tree from a list of credential records and exposes the root hash.
    Uses canonical JSON serialization for deterministic, tamper-proof hashing.
    """

    def __init__(self, credentials):
        self.leaves = [self._hash_record(c) for c in (credentials or [])]
        self.root = self._build_tree(self.leaves) if self.leaves else sha256_hash("EMPTY_BLOCK")

    @staticmethod
    def _hash_record(record):
        if isinstance(record, dict):
            return sha256_hash(canonical_json(record))
        return sha256_hash(str(record))

    def _build_tree(self, leaves):
        if not leaves:
            return sha256_hash("EMPTY")
        if len(leaves) == 1:
            return leaves[0]

        new_level = []
        for i in range(0, len(leaves), 2):
            left = leaves[i]
            right = leaves[i + 1] if i + 1 < len(leaves) else leaves[i]
            combined = left + right
            new_level.append(sha256_hash(combined))

        return self._build_tree(new_level)

    def get_root(self):
        return self.root


# ---------------------------------------------------------------------------
# BLOCK
# ---------------------------------------------------------------------------
class Block:
    """
    A single block in the SkillLedger credential chain.
    """

    def __init__(self, index, credentials, previous_hash, validator="Genesis", timestamp=None):
        self.index = index
        self.timestamp = timestamp or time.time()
        self.credentials = credentials
        self.merkle_root = MerkleTree(credentials).get_root()
        self.previous_hash = previous_hash
        self.validator = validator
        self.nonce = 0
        self.hash = self.compute_hash()

    def compute_hash(self):
        block_content = {
            "index": self.index,
            "timestamp": self.timestamp,
            "merkle_root": self.merkle_root,
            "previous_hash": self.previous_hash,
            "validator": self.validator,
            "nonce": self.nonce,
        }
        return sha256_hash(canonical_json(block_content))

    def to_dict(self):
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "credentials": self.credentials,
            "merkle_root": self.merkle_root,
            "previous_hash": self.previous_hash,
            "validator": self.validator,
            "nonce": self.nonce,
            "hash": self.hash,
        }


# ---------------------------------------------------------------------------
# BLOCKCHAIN
# ---------------------------------------------------------------------------
class Blockchain:
    """
    The chain of blocks for SkillLedger. Provides:
        - add_block()               : append a new validated block
        - is_chain_valid()          : walk the whole chain and verify integrity
        - tamper_block()            : (for demo purposes) deliberately corrupt a block
        - find_credential()         : search for a credential by certificate ID
        - revoke_credential()       : record on-chain revocation with reason and audit event
        - tamper_evidence()         : (for demo) simulate evidence drift (Test 5)
        - make_evidence_unavailable() : (for demo) simulate unavailable source (Test 6)
        - reset_evidence()          : restore evidence to initial state
        - get_audit_events()        : retrieve audit explorer events
    """

    def __init__(self):
        self.chain = [self._create_genesis_block()]
        self.revocations = {}  # cert_id -> { reason, revoked_at, revoked_by, tx_hash }
        self.audit_events = []
        self._record_audit_event(
            event_type="GENESIS_INITIALIZED",
            actor="System",
            certificate_id="N/A",
            details="SkillLedger genesis block initialized with PoA consensus."
        )

    def _create_genesis_block(self):
        return Block(
            index=0,
            credentials=[{"info": "Genesis Block - SkillLedger Trust Registry Initialized"}],
            previous_hash="0",
            validator="System",
            timestamp=1770000000.0,
        )

    def _record_audit_event(self, event_type, actor, certificate_id, details, tx_hash=None):
        event = {
            "id": f"EVT-{len(self.audit_events) + 1:04d}",
            "event_type": event_type,
            "timestamp": time.time(),
            "actor": actor,
            "certificate_id": certificate_id,
            "tx_hash": tx_hash or f"0x{sha256_hash(f'{event_type}:{time.time()}:{certificate_id}')[:40]}",
            "block_index": len(self.chain) - 1,
            "details": details,
        }
        self.audit_events.append(event)
        return event

    def get_latest_block(self):
        return self.chain[-1]

    def add_block(self, credentials, validator):
        new_block = Block(
            index=len(self.chain),
            credentials=credentials,
            previous_hash=self.get_latest_block().hash,
            validator=validator,
        )
        self.chain.append(new_block)

        # Audit events for sealed credentials
        for cred in credentials:
            cid = cred.get("certificate_id", "N/A")
            manifest_hash = cred.get("evidence_manifest_hash", "NONE")
            self._record_audit_event(
                event_type="CREDENTIAL_SEALED",
                actor=validator,
                certificate_id=cid,
                details=f"Credential sealed in Block #{new_block.index}. Merkle root: {new_block.merkle_root[:16]}… Manifest hash: {manifest_hash[:16]}…",
                tx_hash=new_block.hash,
            )

        return new_block

    def is_chain_valid(self):
        """
        Returns (True, "OK") if the chain is untampered, or
        (False, reason) pointing at exactly where the tampering was detected.
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            if current.hash != current.compute_hash():
                return False, f"Block {current.index} data has been tampered with (hash mismatch)."

            if current.previous_hash != previous.hash:
                return False, f"Block {current.index} is not correctly linked to Block {previous.index} (chain broken)."

        return True, "Blockchain is valid. No tampering detected."

    def tamper_block(self, index, fake_credential):
        """
        FOR DEMO PURPOSES ONLY.
        Simulates an attacker editing a credential directly in storage
        without going through proper consensus or re-signing.
        """
        if 0 <= index < len(self.chain):
            block = self.chain[index]
            block.credentials.append(fake_credential)
            block.merkle_root = MerkleTree(block.credentials).get_root()
            self._record_audit_event(
                event_type="TAMPER_DETECTED",
                actor="Attacker (Simulated)",
                certificate_id=fake_credential.get("certificate_id", "FAKE"),
                details=f"Unauthorized direct modification of Block #{index} storage.",
            )
            return True
        return False

    def find_credential(self, certificate_id):
        """Search every block for a credential with the given certificate_id."""
        for block in self.chain:
            for cred in block.credentials:
                if cred.get("certificate_id") == certificate_id:
                    # Enrich with current revocation status if revoked
                    revocation = self.revocations.get(certificate_id)
                    current_status = "REVOKED" if revocation else cred.get("status", "ACTIVE")
                    return {
                        "block_index": block.index,
                        "credential": cred,
                        "block_hash": block.hash,
                        "status": current_status,
                        "revocation": revocation,
                    }
        return None

    def revoke_credential(self, certificate_id, reason, issuer_name="State University Registrar Office"):
        """
        Revokes a credential, records revocation on the ledger, updates status,
        and creates an immutable audit event.
        """
        found = self.find_credential(certificate_id)
        if not found:
            return False, f"Credential '{certificate_id}' not found on the ledger."

        if certificate_id in self.revocations:
            return False, f"Credential '{certificate_id}' is already revoked."

        tx_hash = f"0x{sha256_hash(f'REVOKE:{certificate_id}:{time.time()}')[:40]}"
        revocation_data = {
            "certificate_id": certificate_id,
            "reason": reason,
            "revoked_at": time.time(),
            "revoked_by": issuer_name,
            "tx_hash": tx_hash,
        }
        self.revocations[certificate_id] = revocation_data

        # Also update status in credential dict
        found["credential"]["status"] = "REVOKED"

        self._record_audit_event(
            event_type="CREDENTIAL_REVOKED",
            actor=issuer_name,
            certificate_id=certificate_id,
            details=f"Credential revoked. Reason: {reason}",
            tx_hash=tx_hash,
        )
        return True, "Credential revoked successfully."

    def tamper_evidence(self, certificate_id, altered_content="Altered commit hash: 9999999 (tampered project content)"):
        """
        FOR DEMO PURPOSES (Test 5: Evidence Drift).
        Simulates supporting evidence (e.g., GitHub commit, project file) changing
        AFTER credential issuance, demonstrating drift detection.
        """
        found = self.find_credential(certificate_id)
        if not found:
            return False, "Credential not found."

        items = found["credential"].get("evidence_items") or []
        if not items:
            return False, "No evidence items attached to this credential."

        # Mutate the first evidence item's current content and recalculate current fingerprint
        target = items[0]
        target["current_content"] = altered_content
        target["current_fingerprint"] = sha256_hash(altered_content)
        target["status"] = "MODIFIED"

        self._record_audit_event(
            event_type="EVIDENCE_DRIFT_DETECTED",
            actor="Evidence Scanner",
            certificate_id=certificate_id,
            details=f"Evidence '{target.get('title')}' fingerprint drifted from recorded manifest.",
        )
        return True, f"Evidence '{target.get('title')}' content altered to simulate drift."

    def make_evidence_unavailable(self, certificate_id):
        """
        FOR DEMO PURPOSES (Test 6: Evidence Unavailable).
        Simulates an external repository or source being inaccessible.
        """
        found = self.find_credential(certificate_id)
        if not found:
            return False, "Credential not found."

        items = found["credential"].get("evidence_items") or []
        if not items:
            return False, "No evidence items attached to this credential."

        target = items[0]
        target["status"] = "UNAVAILABLE"

        self._record_audit_event(
            event_type="EVIDENCE_UNAVAILABLE",
            actor="Evidence Scanner",
            certificate_id=certificate_id,
            details=f"Evidence source for '{target.get('title')}' could not be reached.",
        )
        return True, f"Evidence '{target.get('title')}' marked as UNAVAILABLE."

    def reset_evidence(self, certificate_id):
        """Restores evidence back to original pristine state."""
        found = self.find_credential(certificate_id)
        if not found:
            return False, "Credential not found."

        items = found["credential"].get("evidence_items") or []
        for it in items:
            it["current_content"] = it.get("original_content", "")
            it["current_fingerprint"] = it.get("original_fingerprint", "")
            it["status"] = "UNCHANGED"

        return True, "Evidence restored to original fingerprints."

    def get_audit_events(self):
        return list(reversed(self.audit_events))

    def to_dict_list(self):
        return [block.to_dict() for block in self.chain]