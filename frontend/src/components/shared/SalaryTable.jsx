import { useState } from 'react';
import SalaryDetailDrawer from './SalaryDetailDrawer';
import { LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../data/salaryData';

/**
 * SalaryTable
 *
 * Props:
 *   rows  {Array}   - salary objects to render (already mapped)
 */
export default function SalaryTable({ rows }) {
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [selectedId,    setSelectedId]    = useState(null);
  const [selectedRow,   setSelectedRow]   = useState(null);

  function openDrawer(row) {
    setSelectedId(row.id);
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  // Safely format the date sub-label under TC — handles both ISO strings and pre-formatted strings
  function formatDateShort(recordedAt) {
    if (!recordedAt) return '';
    const d = new Date(recordedAt);
    if (!isNaN(d.getTime())) {
      // Valid ISO date
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    // Pre-formatted string like "12 Mar 2025, 10:42 AM" — just take the date part
    return recordedAt.split(',')[0] ?? recordedAt;
  }

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
                <tr
                  key={s.id}
                  className="clickable"
                  onClick={() => openDrawer(s)}
                >
                  <td>
                    <div className="company-cell">
                      <div
                        className="company-avatar"
                        style={{ background: s.compBg, color: s.compColor }}
                      >
                        {s.compAbbr}
                      </div>
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
