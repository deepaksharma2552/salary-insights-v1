import { useState, useEffect } from 'react';
import SalaryDetailDrawer from './SalaryDetailDrawer';
import { LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../data/salaryData';
import CompanyLogo from '../shared/CompanyLogo';

export default function SalaryTable({ rows }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function openDrawer(row) {
    setSelectedId(row.id);
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  function formatDateShort(recordedAt) {
    if (!recordedAt) return '';
    const d = new Date(recordedAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
    }
    return recordedAt.split(',')[0] ?? recordedAt;
  }

  return (
    <>
      {/* ================= MOBILE CARDS ================= */}
      {isMobile ? (
        <div className="salary-cards">
          {rows.map(s => {
            const lvlClass = LEVEL_BADGE_CLASS[s.level] ?? 'badge';
            const stClass = STATUS_BADGE_CLASS[s.status] ?? 'status-badge';
            const stLabel = STATUS_LABEL[s.status] ?? s.status;

            return (
              <div
                key={s.id}
                className="salary-card"
                onClick={() => openDrawer(s)}
              >
                <div className="card-top">
                  <CompanyLogo
                    companyId={s.companyId}
                    companyName={s.company}
                    logoUrl={s.logoUrl}
                    website={s.website}
                    size={36}
                    radius={10}
                  />

                  <div className="card-main">
                    <div className="card-company">{s.company}</div>
                    <div className="card-role">{s.role}</div>
                  </div>

                  <span className={stClass}>{stLabel}</span>
                </div>

                <div className="card-middle">
                  <div>
                    <div className="label">Total</div>
                    <div className="value">{s.tc}</div>
                  </div>

                  <div>
                    <div className="label">Base</div>
                    <div className="value small">{s.base}</div>
                  </div>
                </div>

                <div className="card-bottom">
                  <span className={lvlClass}>{s.level}</span>
                  <span className="badge badge-exp">{s.exp}</span>
                  <span className="meta">{s.location}</span>
                  <span className="meta">{formatDateShort(s.recordedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= DESKTOP TABLE (UNCHANGED) ================= */
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
              {rows.map(s => (
                <tr key={s.id} className="clickable" onClick={() => openDrawer(s)}>
                  <td>
                    <div className="company-cell">
                      <CompanyLogo {...s} size={32} radius={8} />
                      <div>
                        <div className="company-name">{s.company}</div>
                        <div className="company-industry">{s.compInd}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.role}</td>
                  <td><span className="badge">{s.level}</span></td>
                  <td>{s.location}</td>
                  <td><span className="badge badge-exp">{s.exp}</span></td>
                  <td>{s.base}</td>
                  <td>{s.tc}</td>
                  <td><span className="status-badge">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SalaryDetailDrawer
        open={drawerOpen}
        salary={selectedRow}
        salaryId={selectedId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRow(null);
          setSelectedId(null);
        }}
      />
    </>
  );
}