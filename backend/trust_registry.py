"""
trust_registry.py
-----------------
On-chain / Ledger-level Trust Registry for SkillLedger institutions and authorized issuers.

Enforces:
    - Registered institutions with lifecycle states (ACTIVE, SUSPENDED).
    - Authorized issuer signing keys and category permissions (e.g. Academic, Professional Skills).
    - Rejection of unauthorized issuance and revocation operations.
"""

import time


class Institution:
    def __init__(self, institution_id: str, name: str, category: str, authorized_keys: list = None, status: str = "ACTIVE"):
        self.institution_id = institution_id
        self.name = name
        self.category = category
        self.authorized_keys = authorized_keys or []
        self.status = status
        self.registered_at = time.time()

    def to_dict(self):
        return {
            "institution_id": self.institution_id,
            "name": self.name,
            "category": self.category,
            "status": self.status,
            "registered_at": self.registered_at,
            "authorized_keys_count": len(self.authorized_keys),
        }


class TrustRegistry:
    """
    Simulates the smart contract trust registry.
    Manages institutions, authorized issuer addresses/keys, and permitted categories.
    """

    def __init__(self):
        self.institutions = {}
        self.authorized_issuers = {}
        self._seed_default_authorities()

    def _seed_default_authorities(self):
        self.register_institution(
            institution_id="INST-001",
            name="State University Registrar Office",
            category="Academic & Professional Skills",
            authorized_categories=["Academic", "Professional Skills", "Internship", "Engineering"],
        )
        self.register_institution(
            institution_id="INST-002",
            name="National Institute of Technology",
            category="Engineering & Technology",
            authorized_categories=["Academic", "Engineering"],
        )

    def register_institution(self, institution_id: str, name: str, category: str, authorized_categories: list = None):
        inst = Institution(institution_id, name, category)
        self.institutions[institution_id] = {
            "entity": inst,
            "authorized_categories": authorized_categories or ["Academic", "Professional Skills"],
            "status": "ACTIVE",
        }
        return inst

    def authorize_issuer(self, institution_id: str, issuer_name: str, key_reference: str, categories: list = None):
        if institution_id not in self.institutions:
            return False, "Institution not registered."
        if self.institutions[institution_id]["status"] != "ACTIVE":
            return False, "Institution is currently suspended."

        self.authorized_issuers[issuer_name] = {
            "institution_id": institution_id,
            "issuer_name": issuer_name,
            "key_reference": key_reference,
            "categories": categories or self.institutions[institution_id]["authorized_categories"],
            "status": "ACTIVE",
            "authorized_at": time.time(),
        }
        return True, "Issuer authorized successfully."

    def is_issuer_authorized(self, issuer_name: str, category: str = None) -> tuple[bool, str]:
        """
        Validates if issuer is registered and authorized for the specified credential category.
        """
        # If issuer is not in issuers map, check if it's one of the registered institutions
        inst_match = next((v for v in self.institutions.values() if v["entity"].name == issuer_name), None)

        if inst_match:
            if inst_match["status"] != "ACTIVE":
                return False, f"Issuing institution '{issuer_name}' is currently suspended."
            if category and category not in inst_match["authorized_categories"]:
                return False, f"Institution '{issuer_name}' is not authorized for category '{category}'."
            return True, "Institution authorized in trust registry."

        issuer_info = self.authorized_issuers.get(issuer_name)
        if not issuer_info:
            return False, f"Issuer '{issuer_name}' is not registered in the trust registry."

        if issuer_info["status"] != "ACTIVE":
            return False, f"Issuer '{issuer_name}' authorization is suspended."

        inst_id = issuer_info["institution_id"]
        inst_info = self.institutions.get(inst_id)
        if not inst_info or inst_info["status"] != "ACTIVE":
            return False, f"Parent institution '{inst_id}' is suspended."

        if category and category not in issuer_info["categories"]:
            return False, f"Issuer is not authorized to issue '{category}' credentials."

        return True, "Issuer authorized in trust registry."

    def get_all_institutions(self):
        return [
            {
                **inst["entity"].to_dict(),
                "authorized_categories": inst["authorized_categories"],
                "status": inst["status"],
            }
            for inst in self.institutions.values()
        ]
