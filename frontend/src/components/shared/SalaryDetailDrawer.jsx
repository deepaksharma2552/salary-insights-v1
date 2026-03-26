import { useEffect, useState } from 'react';
import { LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../utils/salaryMapper';
import api from '../../services/api';
import { mapSalary } from '../../utils/salaryMapper';

/**
 * SalaryDetailDrawer
 *
 * Props:
 *   open      {boolean}   - controls visibility
 *   salary    {object}    - the already-mapped salary row object from the table
 *   salaryId  {string}    - UUID to fetch full details from API
 *   onClose   {function}  - called when user dismisses the drawer
 */
export default function SalaryDetailDrawer({ open, salary: rowSalary, salaryId, onClose }) {
  const [salary,  setSalary]  = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch full details from API when drawer opens
  useEffect(() => {
    if (!open || !salaryId) return;
    // Use the row data immediately so drawer opens instantly
    if (rowSalary) setSalary(rowSalary);
    // Then fetch full details (includes notes, etc.)
    setLoading(true);
    api.get(`/public/salaries/${salaryId}`)
      .then(res => {
        const s = res.data?.data;
        if (!s) return;
        // Use shared mapper, then layer in the extra fields the drawer needs
        const base = mapSalary(s);
        setSalary({
          ...base,
          standardized: s.standardizedLevelName ?? '—',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, salaryId]);

  // Clear salary when drawer closes
  useEffect(() => {
    if (!open) setSalary(null);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const lvlClass = LEVEL_BADGE_CLASS[salary?.level] ?? 'badge';
  const stClass  = STATUS_BADGE_CLASS[salary?.status] ?? 'status-badge';
  const stLabel  = STATUS_LABEL[salary?.status] ?? salary?.status;
  const capLevel = salary?.level
    ? salary.level.charAt(0).toUpperCase() + salary.level.slice(1)
    : '—';

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay${open ? ' open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={`drawer${open ? ' open' : ''}`} role="dialog" aria-modal="true">

        {/* ── HEADER ── */}
        <div className="drawer-header">
          <button className="drawer-close" onClick={onClose}>✕</button>

          {salary ? (
            <>
              <div className="drawer-company-row">
                <div
                  className="drawer-company-avatar"
                  style={{ background: salary.compBg, color: salary.compColor }}
                >
                  {salary.compAbbr}
                </div>
                <div>
                  <div className="drawer-company-name">{salary.company}</div>
                  <div className="drawer-role">{salary.role} · {salary.location}</div>
                </div>
              </div>
              <div className="drawer-badges">
                <span className={lvlClass}>{capLevel}</span>
                {salary.exp && salary.exp !== '—' && (
                  <span className="badge badge-exp">{salary.exp}</span>
                )}
                <span className={stClass}>{stLabel}</span>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, padding: '20px 0' }}>
              {loading ? 'Loading…' : 'Entry not found'}
            </div>
          )}
        </div>

        {/* ── BODY ── */}
        {salary && (
          <div className="drawer-body">

            {/* Compensation breakdown */}
            <div className="drawer-section-title">Compensation Breakdown</div>
            <div className="comp-breakdown">
              <div className="comp-item highlight">
                <div className="comp-item-label">Total Compensation</div>
                <div className="comp-item-val">{salary.tc}</div>
              </div>
              <div className="comp-item">
                <div className="comp-item-label">Base Salary</div>
                <div className="comp-item-val">{salary.base}</div>
              </div>
              <div className="comp-item">
                <div className="comp-item-label">Annual Bonus</div>
                <div className="comp-item-val">{salary.bonus}</div>
              </div>
              <div className="comp-item" style={{ gridColumn: 'span 2' }}>
                <div className="comp-item-label">Equity / RSU (annualised)</div>
                <div className="comp-item-val">{salary.equity}</div>
              </div>
            </div>

            {/* Role & Experience */}
            <div className="drawer-section-title">Role & Experience</div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Job Title</span>
                <span className="detail-val">{salary.role}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Internal Level</span>
                <span className="detail-val">{salary.internalLevel}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Standardised Level</span>
                <span className="detail-val">{salary.standardized}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Years of Experience</span>
                <span className="detail-val">{salary.yoe}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Employment Type</span>
                <span className="detail-val">{salary.empType}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-val">{salary.location}</span>
              </div>
            </div>

            {/* Recorded date */}
            <div className="drawer-recorded">
              <div className="drawer-recorded-icon">🗓</div>
              <div>Entry recorded on <strong>{salary.recordedAt}</strong></div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
