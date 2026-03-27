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

// Helper — renders a detail cell only when the value is meaningful
function DetailItem({ label, value }) {
  if (!value || value === '—' || value === '') return null;
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-val">{value}</span>
    </div>
  );
}

export default function SalaryDetailDrawer({ open, salary: rowSalary, salaryId, onClose }) {
  const [salary,  setSalary]  = useState(null);
  const [loading, setLoading] = useState(false);
  // Raw API response for fields not in the mapped object
  const [raw, setRaw] = useState(null);

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
        setRaw(s);
        // Use shared mapper, then layer in the extra fields the drawer needs
        const base = mapSalary(s);
        setSalary({
          ...base,
          standardized: s.standardizedLevelName ?? null,
          dataSource:   s.dataSource ?? null,
          equityTotalGrant: s.equityTotalGrant ?? null,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, salaryId]);

  // Clear salary when drawer closes
  useEffect(() => {
    if (!open) { setSalary(null); setRaw(null); }
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

  // Determine if this is an AI-sourced entry and what the source is
  const isAI      = salary?.dataSource && salary.dataSource !== 'User';
  const aiSource  = isAI ? salary.dataSource : null;

  // Equity: show both per-year and total grant if available
  const equityPerYr    = salary?.equity && salary.equity !== '—' ? salary.equity : null;
  const equityTotal    = salary?.equityTotalGrant
    ? `₹${(salary.equityTotalGrant / 100000).toFixed(1)}L`
    : null;

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

            {/* AI source callout */}
            {isAI && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', marginBottom: 16, borderRadius: 8,
                background: 'rgba(139,92,246,0.08)',
                border: '0.5px solid rgba(139,92,246,0.25)',
                fontSize: 12, color: 'rgba(167,139,250,0.9)',
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                <span>✦</span>
                <span>AI-sourced · {aiSource}</span>
              </div>
            )}

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
              {/* Equity — show per-year + total grant if we have both */}
              {equityTotal && equityTotal !== equityPerYr ? (
                <>
                  <div className="comp-item">
                    <div className="comp-item-label">Equity / yr (annualised)</div>
                    <div className="comp-item-val">{equityPerYr ?? '—'}</div>
                  </div>
                  <div className="comp-item">
                    <div className="comp-item-label">Total RSU Grant</div>
                    <div className="comp-item-val">{equityTotal}</div>
                  </div>
                </>
              ) : (
                <div className="comp-item" style={{ gridColumn: 'span 2' }}>
                  <div className="comp-item-label">Equity / RSU (annualised)</div>
                  <div className="comp-item-val">{equityPerYr ?? '—'}</div>
                </div>
              )}
            </div>

            {/* Role & Experience */}
            <div className="drawer-section-title">Role & Experience</div>
            <div className="detail-grid">
              <DetailItem label="Job Title"           value={salary.role} />
              <DetailItem label="Internal Level"      value={salary.internalLevel !== '—' ? salary.internalLevel : null} />
              <DetailItem label="Standardised Level"  value={salary.standardized} />
              <DetailItem label="Years of Experience" value={salary.yoe !== '—' ? salary.yoe : null} />
              <DetailItem label="Employment Type"     value={salary.empType} />
              <DetailItem label="Location"            value={salary.location} />
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
