import { Link } from 'react-router-dom';

const VALUES = [
  { icon: '🔒', title: 'Anonymous by default', desc: 'Every salary submission is anonymous. We never store any identifying information alongside salary data.' },
  { icon: '✅', title: 'Community verified', desc: 'Submissions go through a review process before being published, keeping data quality high.' },
  { icon: '🇮🇳', title: 'Built for India', desc: 'Focused on India\'s tech ecosystem — Bengaluru, Hyderabad, Pune, Delhi-NCR and beyond.' },
  { icon: '🤝', title: 'Community first', desc: 'Built by engineers, for engineers. Every feature exists because the community asked for it.' },
];

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '56px 24px 48px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <span className="section-tag" style={{ display: 'block', marginBottom: 8 }}>About Us</span>
          <h1 className="section-title" style={{ fontSize: 36, marginBottom: 16 }}>
            Built by engineers who were <em>tired of guessing</em>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>
            SalaryInsights360 started because salary data in India was opaque, scattered and unreliable.
            We built the platform we wished existed — transparent, community-powered and 100% anonymous.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <span className="section-tag">Our Mission</span>
            <h2 className="section-title" style={{ margin: '8px 0 16px' }}>Transparency in compensation for every engineer in India</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 16 }}>
              Salary negotiation is stressful when you don't know what's fair. We believe every engineer deserves access to real compensation data — not just the people with the right connections.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.75 }}>
              By crowdsourcing anonymous salary data from the community, we give everyone — from freshers to senior engineers — the information they need to make confident career decisions.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 18px' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '36px 40px', textAlign: 'center' }}>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Join the community</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
              The more people share, the better the data gets for everyone. It takes 2 minutes and it's completely anonymous.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/submit" style={{ padding: '10px 22px', background: '#0ea5e9', color: 'white', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Share My Salary →
              </Link>
              <Link to="/salaries" style={{ padding: '10px 22px', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Browse Salaries
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
