import { Link } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

const PLATFORM = [
  { label: 'Salary Database', to: '/salaries' },
  { label: 'Companies',       to: '/companies' },
  { label: 'Analytics',       to: '/dashboard' },
  { label: 'Level Guide',     to: '/level-guide' },
  { label: 'Opportunities',   to: '/opportunities' },
];

const CONTRIBUTE = [
  { label: 'Share My Salary',     to: '/submit' },
  { label: 'Post an Opportunity', to: '/opportunities/post' },
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
  const isMobile = useIsMobile();

  // Desktop: 4-col brand+links. Mobile: 2-col links, brand full-width on top.
  const gridCols = isMobile ? '1fr 1fr' : '1.6fr 1fr 1fr 1fr';

  return (
    <footer style={{
      background: 'var(--panel)',
      borderTop: '1px solid var(--border)',
      paddingTop: 40,
      paddingBottom: 24,
      marginTop: 'auto',
    }}>
      <style>{`</style>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>

        {/* Brand block — full width on mobile, first column on desktop */}
        {isMobile && (
          <div style={{ marginBottom: 28 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1 }}>
                Salary<span style={{ color: '#3b82f6' }}>Insights</span>
              </div>
            </Link>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              India's AI-enriched, community-verified salary intelligence platform.
            </p>
          </div>
        )}

        {/* Link columns grid */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? 24 : 40, marginBottom: 40 }}>

          {/* Brand column — desktop only */}
          {!isMobile && (
            <div>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1 }}>
                  Salary<span style={{ color: '#3b82f6' }}>Insights</span>
                </div>
              </Link>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 280 }}>
                India's AI-enriched, community-verified salary intelligence platform. Anonymous, verified and built by engineers, for engineers.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Link to="/submit" style={{ padding: '7px 14px', background: '#3b82f6', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  Share Salary →
                </Link>
              </div>
            </div>
          )}

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
