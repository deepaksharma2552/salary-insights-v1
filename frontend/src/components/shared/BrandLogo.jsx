import { Link } from 'react-router-dom';

/**
 * BrandLogo — shared logo component that matches the Navbar exactly.
 * Used in Navbar, LoginPage, and RegisterPage to keep the brand consistent.
 *
 * Props:
 *   size      — icon box size in px (default 30, auth pages use 38)
 *   fontSize  — text size in px    (default 14.5, auth pages use 18)
 *   gap       — gap between icon and text (default 9)
 *   linkTo    — where clicking the logo navigates (default "/")
 *   style     — extra styles on the wrapper <Link>
 */
export default function BrandLogo({
  size     = 30,
  fontSize = 14.5,
  gap      = 9,
  linkTo   = '/',
  style    = {},
}) {
  const iconRadius   = Math.round(size * 0.3);   // border-radius scales with size
  const iconFontSize = Math.round(size * 0.47);   // bar-chart SVG scales proportionally
  const svgSize      = Math.round(size * 0.47);

  return (
    <Link
      to={linkTo}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        textDecoration: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* ── Icon box — matches .nb-logo-icon exactly ── */}
      <div style={{
        width:      size,
        height:     size,
        borderRadius: iconRadius,
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow:  '0 2px 8px rgba(59,130,246,0.35)',
      }}>
        {/* Bar-chart icon — same SVG as Navbar Icon.logo */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4"  />
          <line x1="6"  y1="20" x2="6"  y2="14" />
        </svg>
      </div>

      {/* ── Wordmark ── */}
      <span style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           1,
        lineHeight:    1,
      }}>
        <span style={{
          fontSize,
          fontWeight:    700,
          letterSpacing: '-0.03em',
          color:         'var(--text-1)',
          fontFamily:    'Inter, sans-serif',
        }}>
          Salary<span style={{ color: '#3b82f6' }}>Insights</span>
        </span>
        {/* Tagline shown only when size is large enough (auth pages) */}
        {size >= 36 && (
          <span style={{
            fontSize:      8.5,
            fontWeight:    500,
            letterSpacing: '0.12em',
            color:         '#3b82f6',
            fontFamily:    "'IBM Plex Mono', monospace",
            textTransform: 'uppercase',
            opacity:       0.75,
          }}>
            360° Career Clarity
          </span>
        )}
      </span>
    </Link>
  );
}
