import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getChain, tamperDemo, resetChain } from '../api/client';

export default function ChainVisualization({ showToast }) {
  const [chainInfo, setChainInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tampering, setTampering] = useState(false);
  const prevLengthRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await getChain();
      setChainInfo(data);
    } catch (e) {
      showToast('Could not reach the backend.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTamper = async () => {
    setTampering(true);
    try {
      const res = await tamperDemo();
      showToast(res.message, 'error');
      load();
    } catch (e) {
      const msg = e.response?.data?.error || 'Tamper demo failed.';
      showToast(msg, 'error');
    } finally {
      setTampering(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetChain();
      showToast('Chain reset to genesis.', 'success');
      load();
    } catch (e) {
      showToast('Reset failed.', 'error');
    }
  };

  if (loading) return <div className="page-subtitle">Loading chain…</div>;
  if (!chainInfo) return null;

  const { chain, is_valid } = chainInfo;

  // Determine the first tampered block index (if any) so we know where
  // the visual "break" in the chain begins. Once one block fails its hash
  // check, every block after it is considered compromised too, since the
  // link depends on the previous block's hash.
  let firstBadIndex = null;
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const previous = chain[i - 1];
    // We can't recompute hashes client-side (no access to timestamps'
    // exact float precision issues aside, the logic lives server-side),
    // so we rely on the server's overall is_valid + scan for the specific
    // block whose previous_hash no longer matches the chain visually.
    if (current.previous_hash !== previous.hash) {
      firstBadIndex = current.index;
      break;
    }
  }
  // If the chain is invalid but links still match (i.e. a block's own
  // contents were edited without breaking the previous_hash pointer),
  // mark the known tampered block. Our backend's tamper-demo always
  // targets block index 1.
  if (!is_valid && firstBadIndex === null) {
    firstBadIndex = 1;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="page-title">Chain Visualization</div>
          <div className="page-subtitle">Each block links to the previous via its hash</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleReset}>Reset Chain</button>
          <button className="btn btn-danger" onClick={handleTamper} disabled={tampering}>
            {tampering ? 'Tampering…' : 'Trigger Tamper Demo'}
          </button>
        </div>
      </div>

      <div className={`chain-integrity-banner ${is_valid ? 'banner-ok' : 'banner-bad'}`}>
        <span className="badge-dot" />
        {is_valid ? 'Chain Integrity: VALID — every link verified' : chainInfo.validity_message}
      </div>

      <div className="chain-track">
        {chain.map((block, i) => {
          const isBad = firstBadIndex !== null && block.index >= firstBadIndex;
          const isNew = i === chain.length - 1 && chain.length > prevLengthRef.current;
          return (
            <div className="chain-node-wrap" key={block.hash + block.index}>
              {i > 0 && (
                <ChainLink broken={isBad} />
              )}
              <BlockNode block={block} broken={isBad} isNew={isNew} />
            </div>
          );
        })}
      </div>
      {(() => { prevLengthRef.current = chain.length; return null; })()}
    </div>
  );
}

function ChainLink({ broken }) {
  return (
    <div className="chain-link-svg-wrap">
      <svg width="64" height="40" viewBox="0 0 64 40">
        <motion.line
          x1="0" y1="20" x2="64" y2="20"
          stroke={broken ? 'var(--status-danger)' : 'var(--accent-cyan)'}
          strokeWidth={broken ? 2.5 : 2}
          strokeDasharray={broken ? '4 4' : '0'}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={
            broken
              ? { pathLength: 1, opacity: 1, x: [0, -2, 2, -1, 1, 0] }
              : { pathLength: 1, opacity: 1 }
          }
          transition={
            broken
              ? { duration: 0.4, x: { duration: 0.3, repeat: 2 } }
              : { duration: 0.6, ease: 'easeOut' }
          }
        />
        {broken && (
          <motion.text
            x="32" y="12" textAnchor="middle"
            fill="var(--status-danger)"
            fontSize="14"
            fontFamily="var(--font-mono)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            ✕
          </motion.text>
        )}
      </svg>
    </div>
  );
}

function BlockNode({ block, broken, isNew }) {
  const isGenesis = block.index === 0;
  return (
    <motion.div
      initial={isNew ? { opacity: 0, scale: 0.85, y: 16 } : { opacity: 1, scale: 1, y: 0 }}
      animate={
        broken
          ? { opacity: 1, scale: 1, y: 0, x: [0, -3, 3, -2, 2, 0] }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={broken ? { x: { duration: 0.35, repeat: 1 } } : { duration: 0.45, ease: 'easeOut' }}
      className={`block-node ${broken ? 'block-node-bad' : ''} ${isGenesis ? 'block-node-genesis' : ''}`}
    >
      <div className="block-node-index">
        {isGenesis ? 'GENESIS' : `BLOCK #${block.index}`}
      </div>
      <div className="block-node-hash">
        <span className="block-node-hash-label">hash</span>
        <span className="truncate-hash">{block.hash.slice(0, 16)}…</span>
      </div>
      <div className="block-node-hash">
        <span className="block-node-hash-label">prev</span>
        <span className="truncate-hash">{block.previous_hash === '0' ? 'null' : block.previous_hash.slice(0, 16) + '…'}</span>
      </div>
      <div className="block-node-footer">
        <span>{block.validator}</span>
        <span>{block.credentials.length} cred(s)</span>
      </div>
      {broken && <div className="block-node-glitch-tag">TAMPERED</div>}
    </motion.div>
  );
}