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
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>

          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 14 }}>
              <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#0ea5e9', borderRightColor: '#7dd3fc', animation: 'navRingSpin 3s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '1.5px solid transparent', borderBottomColor: '#e0f2fe', borderLeftColor: '#0284c7', animation: 'navRingSpinRev 2s linear infinite', opacity: 0.55 }} />
                <div style={{ position: 'absolute', inset: 8, borderRadius: 5, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', fontFamily: 'Inter,sans-serif' }}>SI</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                  Salary<span style={{ color: '#0ea5e9' }}>Insights</span>
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#0ea5e9', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono',monospace", opacity: 0.8 }}>
                  360° COMPENSATION
                </div>
              </div>
            </Link>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 280 }}>
              India's community-powered salary intelligence platform. Anonymous, verified and built by engineers, for engineers.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Link to="/submit" style={{ padding: '7px 14px', background: '#0ea5e9', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
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
