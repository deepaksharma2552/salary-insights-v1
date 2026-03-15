import { useEffect } from 'react';
import { SALARIES, LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS, STATUS_LABEL } from '../../data/salaryData';

/**
 * SalaryDetailDrawer
 *
 * Props:
 *   open     {boolean}  - controls visibility
 *   salaryId {number}   - id of the salary entry to display
 *   onClose  {function} - called when user dismisses the drawer
 *
 * NOTE: In production replace the SALARIES lookup with a real API call:
 *   GET /api/public/salaries/:salaryId
 */
export default function SalaryDetailDrawer({ open, salaryId, onClose }) {
  const salary = SALARIES.find(s => s.id === salaryId) ?? null;

  // Lock body scroll while drawer is open
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

  if (!salary) return null;

  const lvlClass = LEVEL_BADGE_CLASS[salary.level] ?? 'badge';
  const stClass  = STATUS_BADGE_CLASS[salary.status] ?? 'status-badge';
  const stLabel  = STATUS_LABEL[salary.status] ?? salary.status;
  const capLevel = salary.level.charAt(0).toUpperCase() + salary.level.slice(1);

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
            <span className="badge badge-exp">{salary.exp}</span>
            <span className={stClass}>{stLabel}</span>
          </div>
        </div>

        {/* ── BODY ── */}
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
              <span className="detail-val">{capLevel}</span>
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

          {/* Notes */}
          <div className="drawer-section-title">Notes</div>
          <div className="notes-box">{salary.notes}</div>

          {/* Recorded date */}
          <div className="drawer-recorded">
            <div className="drawer-recorded-icon">🗓</div>
            <div>Entry recorded on <strong>{salary.recordedAt}</strong></div>
          </div>

        </div>
      </div>
    </>
  );
}
