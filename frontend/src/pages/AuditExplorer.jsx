import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getAudit } from '../api/client';

export default function AuditExplorer({ showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      const data = await getAudit();
      setEvents(data.audit_events || []);
    } catch (e) {
      showToast('Could not load audit log from backend.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const filteredEvents = events.filter((e) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(term) ||
      e.certificate_id.toLowerCase().includes(term) ||
      e.actor.toLowerCase().includes(term) ||
      e.details.toLowerCase().includes(term)
    );
  });

  const getEventBadgeColor = (type) => {
    if (type.includes('REVOKE') || type.includes('TAMPER')) return 'var(--status-danger)';
    if (type.includes('DRIFT')) return 'var(--accent-amber)';
    if (type.includes('SEALED')) return 'var(--accent-cyan)';
    return 'var(--status-ok)';
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="page-title">Audit Explorer</div>
          <div className="page-subtitle">Immutable ledger event log: issuance, evidence anchoring, revocations, and consensus</div>
        </div>
        <button className="btn btn-ghost" onClick={loadEvents}>
          Refresh Log
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <input
          className="input-field"
          style={{ width: '100%' }}
          placeholder="Search by event type, certificate ID, actor, or transaction hash..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="panel">
        <div className="panel-title">Blockchain Audit Events ({filteredEvents.length})</div>

        {loading ? (
          <div className="empty-state">Loading ledger events…</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">No audit events match your filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredEvents.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--bg-panel-raised)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: 'var(--bg-panel)',
                        border: `1px solid ${getEventBadgeColor(ev.event_type)}`,
                        color: getEventBadgeColor(ev.event_type),
                        letterSpacing: '0.04em',
                      }}
                    >
                      {ev.event_type}
                    </span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{ev.certificate_id !== 'N/A' ? ev.certificate_id : 'System Event'}</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                    {new Date(ev.timestamp * 1000).toLocaleTimeString()} · Block #{ev.block_index}
                  </span>
                </div>

                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  {ev.details}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                    Actor: <strong style={{ color: 'var(--text-primary)' }}>{ev.actor}</strong>
                  </span>
                  <span className="truncate-hash" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                    Tx: {ev.tx_hash}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
