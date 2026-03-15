import { useState } from 'react';
import SalaryDetailDrawer from './SalaryDetailDrawer';
import { LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../data/salaryData';

/**
 * SalaryTable
 *
 * Props:
 *   rows  {Array}   - salary objects to render
 *
 * Handles its own drawer state internally.
 */
export default function SalaryTable({ rows }) {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [selectedId, setSelectedId]   = useState(null);

  function openDrawer(id) {
    setSelectedId(id);
    setDrawerOpen(true);
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
              const capLevel = s.level.charAt(0).toUpperCase() + s.level.slice(1);

              return (
                <tr
                  key={s.id}
                  className="clickable"
                  onClick={() => openDrawer(s.id)}
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
                  <td><span className={lvlClass}>{capLevel}</span></td>
                  <td>{s.location}</td>
                  <td><span className="badge badge-exp">{s.exp}</span></td>
                  <td><div className="salary-amount">{s.base}</div></td>
                  <td>
                    <div className="salary-amount" style={{ fontSize: 16 }}>{s.tc}</div>
                    <div style={{ fontSize: 10, marginTop: 2, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.recordedAt.split(',')[0]}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={stClass}>{stLabel}</span>
                      <button
                        className="view-btn"
                        onClick={e => { e.stopPropagation(); openDrawer(s.id); }}
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
        salaryId={selectedId}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
