import { useState } from 'react';
import SalaryDetailDrawer from './SalaryDetailDrawer';
import { LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../data/salaryData';
import CompanyLogo from '../shared/CompanyLogo';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function SalaryTable({ rows }) {
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [selectedId,  setSelectedId]  = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const isMobile = useIsMobile();

  function openDrawer(row) {
    setSelectedId(row.id);
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  function formatDateShort(recordedAt) {
    if (!recordedAt) return '';
    const d = new Date(recordedAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return recordedAt.split(',')[0] ?? recordedAt;
  }

  // ── MOBILE CARD VIEW ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(s => {
            const lvlClass = LEVEL_BADGE_CLASS[s.level] ?? 'badge';
            const stClass  = STATUS_BADGE_CLASS[s.status] ?? 'status-badge';
            const stLabel  = STATUS_LABEL[s.status] ?? s.status;
            const capLevel = s.level
              ? s.level.charAt(0).toUpperCase() + s.level.slice(1)
              : '—';

            return (
              <div
                key={s.id}
                onClick={() => openDrawer(s)}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onTouchStart={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
                onTouchEnd={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Top row: company + TC */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <CompanyLogo
                      companyId={s.companyId}
                      companyName={s.company}
                      logoUrl={s.logoUrl}
                      website={s.website}
                      size={34}
                      radius={8}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.company}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.role}
                      </div>
                    </div>
                  </div>
                  {/* TC — right aligned */}
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                      {s.tc}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Total Comp</div>
                  </div>
                </div>

                {/* Middle row: badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  <span className={lvlClass}>{capLevel}</span>
                  {s.internalLevel && s.internalLevel !== '—' && (
                    <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontFamily: "'IBM Plex Mono',monospace" }}>
                      {s.internalLevel}
                    </span>
                  )}
                  {s.exp && s.exp !== '—' && (
                    <span className="badge badge-exp">{s.exp}</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-3)', borderRadius: 4, padding: '2px 6px' }}>
                    📍 {s.location}
                  </span>
                </div>

                {/* Bottom row: base salary + status + date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>Base</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                      {s.base}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={stClass}>{stLabel}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{formatDateShort(s.recordedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <SalaryDetailDrawer
          open={drawerOpen}
          salary={selectedRow}
          salaryId={selectedId}
          onClose={() => { setDrawerOpen(false); setSelectedRow(null); setSelectedId(null); }}
        />
      </>
    );
  }

  // ── DESKTOP TABLE VIEW (unchanged) ─────────────────────────────────────────
  return (
    <>
      <div className="salary-table-wrap">
        <table className="salary-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Std. Level</th>
              <th>Location</th>
              <th>Experience</th>
              <th>Base Salary</th>
              <th>Total Comp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const lvlClass = LEVEL_BADGE_CLASS[s.level] ?? 'badge';
              const stClass  = STATUS_BADGE_CLASS[s.status] ?? 'status-badge';
              const stLabel  = STATUS_LABEL[s.status] ?? s.status;
              const capLevel = s.level
                ? s.level.charAt(0).toUpperCase() + s.level.slice(1)
                : '—';

              return (
                <tr key={s.id} className="clickable" onClick={() => openDrawer(s)}>
                  <td>
                    <div className="company-cell">
                      <CompanyLogo
                        companyId={s.companyId}
                        companyName={s.company}
                        logoUrl={s.logoUrl}
                        website={s.website}
                        size={32}
                        radius={8}
                      />
                      <div>
                        <div className="company-name">{s.company}</div>
                        <div className="company-industry">{s.compInd}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.role}</td>
                  <td>
                    <span className={lvlClass}>{capLevel}</span>
                    {s.internalLevel && s.internalLevel !== '—' && (
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>
                        {s.internalLevel}
                      </div>
                    )}
                  </td>
                  <td>{s.location}</td>
                  <td>
                    {s.exp && s.exp !== '—'
                      ? <span className="badge badge-exp">{s.exp}</span>
                      : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td><div className="salary-amount">{s.base}</div></td>
                  <td>
                    <div className="salary-amount" style={{ fontSize: 16 }}>{s.tc}</div>
                    <div style={{ fontSize: 10, marginTop: 2, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatDateShort(s.recordedAt)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={stClass}>{stLabel}</span>
                      <button
                        className="view-btn"
                        onClick={e => { e.stopPropagation(); openDrawer(s); }}
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SalaryDetailDrawer
        open={drawerOpen}
        salary={selectedRow}
        salaryId={selectedId}
        onClose={() => { setDrawerOpen(false); setSelectedRow(null); setSelectedId(null); }}
      />
    </>
  );
}
