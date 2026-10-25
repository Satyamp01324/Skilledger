"""
consensus.py
-------------
Proof-of-Authority (PoA) consensus simulation.

WHY PoA INSTEAD OF PROOF-OF-WORK:
    - Proof-of-Work (Bitcoin-style) is designed for a PUBLIC, trustless
      network. It needs expensive computation to prevent spam/attacks
      from anonymous miners.
    - A university credential system is a PERMISSIONED network: only a
      small set of KNOWN, TRUSTED authorities should ever be allowed to
      add records.
    - PoA fits this perfectly: a fixed set of validator nodes take turns
      validating blocks. No wasted computation, much faster, and matches
      how real consortium blockchains (e.g. Hyperledger Fabric) work.
"""

import random


class ValidatorNode:
    """A single trusted validator node (e.g. one university's registrar server)."""

    def __init__(self, node_id, name):
        self.node_id = node_id
        self.name = name
        self.is_online = True  # can be toggled to simulate node failure

    def validate(self, credentials_batch):
        """
        In a real system this would check digital signatures, check for
        duplicate certificate IDs, run business rules, etc.
        Here we simulate that check: a node approves a batch if it's online
        and the batch isn't empty / malformed.
        """
        if not self.is_online:
            return False
        if not credentials_batch or not isinstance(credentials_batch, list):
            return False
        return True


class PoAConsensus:
    """
    Manages a fixed set of validator nodes and runs the PoA agreement
    process: a batch of credentials is only committed to the blockchain
    if a MAJORITY of validator nodes approve it.
    """

    def __init__(self, validator_names=None):
        if validator_names is None:
            validator_names = ["RegistrarNode-A", "RegistrarNode-B", "RegistrarNode-C"]
        self.nodes = [ValidatorNode(i, name) for i, name in enumerate(validator_names)]
        self.round_robin_index = 0

    def reach_consensus(self, credentials_batch):
        """
        Runs the PoA voting round.
        Returns: (approved: bool, votes: list of dicts, chosen_validator: str)
        """
        votes = []
        for node in self.nodes:
            approved = node.validate(credentials_batch)
            votes.append({"node": node.name, "approved": approved, "online": node.is_online})

        approvals = sum(1 for v in votes if v["approved"])
        majority_needed = (len(self.nodes) // 2) + 1
        consensus_reached = approvals >= majority_needed

        approving_nodes = [v["node"] for v in votes if v["approved"]]
        chosen_validator = approving_nodes[self.round_robin_index % len(approving_nodes)] if approving_nodes else None
        self.round_robin_index += 1

        return consensus_reached, votes, chosen_validator

    def set_node_status(self, node_id, is_online):
        """Lets the demo simulate a validator node going offline."""
        for node in self.nodes:
            if node.node_id == node_id:
                node.is_online = is_online
                return True
        return False

    def get_status(self):
        return [{"node_id": n.node_id, "name": n.name, "online": n.is_online} for n in self.nodes]