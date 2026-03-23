import { Link } from 'react-router-dom';

const PLATFORM = [
  { label: 'Salary Database', to: '/salaries' },
  { label: 'Companies',       to: '/companies' },
  { label: 'Analytics',       to: '/dashboard' },
  { label: 'Level Guide',     to: '/level-guide' },
  { label: 'Referral Board',  to: '/referrals' },
  { label: 'Launchpad',       to: '/launchpad' },
];

const CONTRIBUTE = [
  { label: 'Share My Salary',    to: '/submit' },
  { label: 'Submit a Referral',  to: '/refer' },
  { label: 'Share Experience',   to: '/launchpad/submit' },
];

const COMPANY = [
  { label: 'About Us',        to: '/about' },
  { label: 'FAQ',             to: '/faq' },
  { label: 'Contact Us',      to: '/contact' },
  { label: 'Privacy Policy',  to: '/privacy' },
  { label: 'Terms of Service',to: '/terms' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--panel)',
      borderTop: '1px solid var(--border)',
      paddingTop: 40,
      paddingBottom: 24,
      marginTop: 'auto',
    }}>
      <style>{`
        @keyframes siOrbitSweepA { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
        @keyframes siOrbitSweepB { from { transform: rotate(90deg);  } to { transform: rotate(450deg); } }
        @keyframes siOrbitSweepC { from { transform: rotate(30deg);  } to { transform: rotate(390deg); } }
        @keyframes siOrbitTrack  { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes siOrbitCore   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes siOrbitPing   { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .si-sweep-a,.si-sweep-b,.si-sweep-c,.si-track,.si-core,.si-ping { animation: none !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>

        {/* Top row */}
        <div className="grid-footer-top">

          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 14 }}>
              <svg width="32" height="32" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
                style={{ flexShrink: 0 }}>
                <circle cx="19" cy="19" r="18" stroke="#3b82f6" strokeWidth="0.8" fill="none"
                  style={{ transformOrigin: '19px 19px', animation: 'siOrbitPing 3s ease-out infinite' }} />
                <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitTrack 20s linear infinite' }}>
                  <circle cx="19" cy="19" r="15" stroke="#3b82f6" strokeWidth="0.7" fill="none" opacity="0.25" strokeDasharray="2.5 2.5" />
                </g>
                <circle cx="19" cy="19" r="9" stroke="#3b82f6" strokeWidth="0.5" fill="none" opacity="0.12" strokeDasharray="1.5 2" />
                <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepA 6s linear infinite' }}>
                  <circle cx="19" cy="4" r="2.2" fill="#3b82f6" />
                </g>
                <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepB 6s linear infinite' }}>
                  <circle cx="19" cy="4" r="1.8" fill="#2563eb" />
                </g>
                <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepC 9s linear infinite' }}>
                  <circle cx="19" cy="4" r="1.4" fill="#60a5fa" opacity="0.7" />
                </g>
                <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitCore 3s ease-in-out infinite' }}>
                  <circle cx="19" cy="19" r="6"   fill="#3b82f6" opacity="0.1" />
                  <circle cx="19" cy="19" r="4"   fill="#3b82f6" opacity="0.2" />
                  <circle cx="19" cy="19" r="2.5" fill="#3b82f6" />
                </g>
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                  Salary<span style={{ color: '#3b82f6' }}>Insights</span>
                </div>
                <div style={{ fontSize: 8.5, fontWeight: 500, color: '#3b82f6', letterSpacing: '0.12em', fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', opacity: 0.75 }}>
                  360° Career Clarity
                </div>
              </div>
            </Link>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 280 }}>
              India's community-powered salary intelligence platform. Anonymous, verified and built by engineers, for engineers.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Link to="/submit" style={{ padding: '7px 14px', background: '#3b82f6', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                Share Salary →
              </Link>
            </div>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Platform</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {PLATFORM.map(({ label, to }) => (
                <Link key={to} to={to} style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-1)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
                >{label}</Link>
              ))}
            </div>
          </div>

          {/* Contribute */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Contribute</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {CONTRIBUTE.map(({ label, to }) => (
                <Link key={to} to={to} style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-1)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
                >{label}</Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Company</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {COMPANY.map(({ label, to }) => (
                <Link key={to} to={to} style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-1)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
                >{label}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
            © {year} SalaryInsights360. All rights reserved. Data is community-sourced and provided for informational purposes only.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/privacy" style={{ fontSize: 12, color: 'var(--text-4)', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms"   style={{ fontSize: 12, color: 'var(--text-4)', textDecoration: 'none' }}>Terms</Link>
            <Link to="/contact" style={{ fontSize: 12, color: 'var(--text-4)', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
