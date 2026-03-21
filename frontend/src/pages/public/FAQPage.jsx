import { useState } from 'react';

const FAQS = [
  {
    category: 'Privacy & Anonymity',
    items: [
      { q: 'Is my salary submission really anonymous?', a: 'Yes, completely. We never store your name, email or any identifying information alongside your salary data. Submissions are reviewed only for data quality and then published with zero personal details.' },
      { q: 'Can my employer see that I submitted?', a: 'No. There is no way for anyone — including your employer — to trace a salary submission back to you. We do not collect device fingerprints, IP addresses or any other identifying metadata linked to submissions.' },
      { q: 'Can I delete my submission?', a: 'Yes. Contact us at support@salaryinsights360.com with the approximate date and role details of your submission and we will remove it within 48 hours.' },
    ],
  },
  {
    category: 'Data Quality',
    items: [
      { q: 'How do you verify salary data?', a: 'Every submission goes through a manual review before being published. We check for obvious errors (e.g. salaries that are clearly unrealistic), flag duplicates and ensure fields like company, role and level are correctly filled.' },
      { q: 'What if I see incorrect data?', a: 'Use the "Report" button on any salary entry or email us at support@salaryinsights360.com. We review all reports within 72 hours.' },
      { q: 'How current is the data?', a: 'All approved entries are dated. You can filter by recency on the Salaries page. We recommend focusing on entries from the last 12 months for the most accurate benchmarks.' },
    ],
  },
  {
    category: 'Platform & Features',
    items: [
      { q: 'What is the Level Guide?', a: 'The Level Guide maps internal levels across companies — so you can see how "SDE 2" at Google compares to "SDE 2" at Amazon or Flipkart. Levels can mean very different things in terms of scope and compensation.' },
      { q: 'What is Launchpad?', a: 'Launchpad is a free interview prep resource for freshers targeting product companies. It includes curated DSA problems, system design guides and real interview experiences shared by engineers who cracked top companies.' },
      { q: 'What is the Referral Board?', a: 'The Referral Board lets community members share referral links for open roles at their companies. If you\'re job hunting, you can find a referral to skip the cold application queue and get a warm introduction.' },
      { q: 'Is there a mobile app?', a: 'Not yet — but the website is fully mobile-responsive. A dedicated app is on our roadmap.' },
    ],
  },
  {
    category: 'Account',
    items: [
      { q: 'Do I need an account to browse salaries?', a: 'No. All salary data is publicly accessible without an account. You only need an account to submit a salary, post a referral or contribute to Launchpad.' },
      { q: 'What can I do with a free account?', a: 'With a free account you can submit your salary, post referrals, share interview experiences on Launchpad and manage your past submissions.' },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', textAlign: 'left', padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', gap: 12 }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 18, color: 'var(--text-3)', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
      </button>
      {open && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, paddingBottom: 16 }}>{a}</div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100vh' }}>
      <section style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="section-tag" style={{ display: 'block', marginBottom: 8 }}>FAQ</span>
        <h1 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>Frequently Asked Questions</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 480, margin: '0 auto' }}>
          Can't find your answer? Email us at <a href="mailto:support@salaryinsights360.com" style={{ color: '#0ea5e9', textDecoration: 'none' }}>support@salaryinsights360.com</a>
        </p>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {FAQS.map(({ category, items }) => (
            <div key={category} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{category}</div>
              {items.map(item => <FAQItem key={item.q} {...item} />)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
