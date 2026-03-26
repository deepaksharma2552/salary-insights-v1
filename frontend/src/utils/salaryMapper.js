/**
 * Shared salary mapping utility and badge/status constants.
 * Previously split between salaryMapper.js and salaryData.js — consolidated here.
 */

const VIZ_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#6366f1', '#a78bfa', '#818cf8'];

const LEVEL_MAP = {
  INTERN:   'junior',
  ENTRY:    'junior',
  MID:      'mid',
  SENIOR:   'senior',
  LEAD:     'lead',
  MANAGER:  'lead',
  DIRECTOR: 'lead',
  VP:       'lead',
  C_LEVEL:  'lead',
};

// ── Badge / status helpers (previously in salaryData.js) ─────────────────────

export const LEVEL_BADGE_CLASS = {
  junior: 'badge badge-level-junior',
  mid:    'badge badge-level-mid',
  senior: 'badge badge-level-senior',
  lead:   'badge badge-level-lead',
};

export const STATUS_BADGE_CLASS = {
  approved: 'status-badge status-approved',
  pending:  'status-badge status-pending',
  rejected: 'status-badge status-rejected',
};

export const STATUS_LABEL = {
  approved: '✓ Verified',
  pending:  '⧗ Pending',
  rejected: '✕ Rejected',
};

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtSalary(val) {
  if (!val && val !== 0) return '—';
  const l = Number(val) / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Main mapper ───────────────────────────────────────────────────────────────

/**
 * Maps a raw API salary entry to the shape expected by SalaryTable / drawers.
 * internalLevel is always populated from standardizedLevelName (the DB-driven field).
 */
export function mapSalary(s) {
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % VIZ_COLORS.length : 0;
  const color    = VIZ_COLORS[colorIdx];

  return {
    id:            s.id,
    company:       s.companyName    ?? '—',
    companyId:     s.companyId      ?? null,
    logoUrl:       s.logoUrl        ?? null,
    website:       s.website        ?? null,
    compAbbr:      s.companyName ? s.companyName.slice(0, 2).toUpperCase() : '?',
    compColor:     color,
    compBg:        `${color}26`,
    compInd:       '',
    role:          s.jobTitle       ?? '—',
    internalLevel: s.standardizedLevelName ?? '—',
    level:         LEVEL_MAP[s.experienceLevel] ?? 'mid',
    location:      s.location       ?? '—',
    exp:           s.yearsOfExperience != null ? `${s.yearsOfExperience} yr`  : '—',
    yoe:           s.yearsOfExperience != null
      ? `${s.yearsOfExperience} year${s.yearsOfExperience !== 1 ? 's' : ''}`
      : '—',
    empType:       s.employmentType ?? 'Full-time',
    base:          fmtSalary(s.baseSalary),
    bonus:         fmtSalary(s.bonus),
    equity:        fmtSalary(s.equity),
    tc:            fmtSalary(s.totalCompensation),
    status:        (s.reviewStatus ?? 'APPROVED').toLowerCase(),
    recordedAt:    formatDate(s.createdAt),
    notes:         '',
  };
}
