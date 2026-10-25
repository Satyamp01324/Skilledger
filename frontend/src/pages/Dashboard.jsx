import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getChain, toggleValidator } from '../api/client';

export default function Dashboard({ showToast }) {
  const [chainInfo, setChainInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getChain();
      setChainInfo(data);
    } catch (e) {
      showToast('Could not reach the backend. Is Flask running on :5000?', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleToggle = async (nodeId) => {
    try {
      await toggleValidator(nodeId);
      load();
    } catch (e) {
      showToast('Failed to toggle validator.', 'error');
    }
  };

  if (loading) return <div className="page-subtitle">Loading ledger state…</div>;
  if (!chainInfo) return null;

  const sealedBlocks = chainInfo.chain.filter((b) => b.index !== 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Live state of the credential ledger</div>
      </div>

      <div className="stat-row">
        <StatCard label="Chain Length" value={chainInfo.length} accent="cyan" />
        <StatCard label="Sealed Blocks" value={sealedBlocks.length} accent="violet" />
        <StatCard label="Pending Credentials" value={chainInfo.pending_count} accent="amber" />
        <StatCard
          label="Chain Integrity"
          value={chainInfo.is_valid ? 'VALID' : 'TAMPERED'}
          accent={chainInfo.is_valid ? 'ok' : 'danger'}
          isStatus
        />
      </div>

      <div className="grid-main-side" style={{ marginTop: 28 }}>
        <div className="panel">
          <div className="panel-title">Sealed Blocks</div>
          {sealedBlocks.length === 0 ? (
            <div className="empty-state">No blocks sealed yet. Issue a credential and seal it to get started.</div>
          ) : (
            <div className="block-list">
              {sealedBlocks.slice().reverse().map((block) => (
                <motion.div
                  key={block.hash}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="block-row"
                >
                  <div className="block-row-index">#{block.index}</div>
                  <div className="block-row-main">
                    <div className="block-row-validator">{block.validator}</div>
                    <div className="truncate-hash">{block.hash.slice(0, 24)}…</div>
                  </div>
                  <div className="block-row-count">{block.credentials.length} credential(s)</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">Validator Nodes</div>
          <div className="validator-list">
            {chainInfo.validators.map((v) => (
              <div key={v.node_id} className="validator-row">
                <div className="validator-info">
                  <span className={`badge-dot-standalone ${v.online ? 'dot-ok' : 'dot-off'}`} />
                  <span className="validator-name">{v.name}</span>
                </div>
                <button
                  className={`btn-toggle ${v.online ? 'btn-toggle-on' : 'btn-toggle-off'}`}
                  onClick={() => handleToggle(v.node_id)}
                >
                  {v.online ? 'Online' : 'Offline'}
                </button>
              </div>
            ))}
          </div>
          <div className="consensus-note">
            Majority needed: {Math.floor(chainInfo.validators.length / 2) + 1} of {chainInfo.validators.length} nodes
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, isStatus }) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${isStatus ? 'stat-value-status' : ''}`}>{value}</div>
    </div>
  );
}