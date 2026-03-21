const LAST_UPDATED = 'March 2026';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

function Item({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <strong style={{ color: 'var(--text-1)' }}>{title}:</strong> {children}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100vh' }}>
      <section style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="section-tag" style={{ display: 'block', marginBottom: 8 }}>Legal</span>
        <h1 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Last updated: {LAST_UPDATED}</p>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 48px' }}>

          <Section title="Overview">
            SalaryInsights360 ("we", "us", "our") is committed to protecting your privacy. This policy explains what information we collect, how we use it and the choices you have. By using our platform, you agree to the practices described here.
          </Section>

          <Section title="1. Information We Collect">
            <Item title="Account information">When you register, we collect your name, email address and password (stored as a secure hash).</Item>
            <Item title="Salary submissions">Salary data you submit, including company, role, level, location and compensation figures. This data is stored and published anonymously — it is never linked to your identity in the public database.</Item>
            <Item title="Referral and Launchpad content">Content you submit to the Referral Board or Launchpad is attributed only to your account username (if you choose to display one).</Item>
            <Item title="Usage data">Standard server logs including page views and API requests. We do not use third-party analytics trackers.</Item>
          </Section>

          <Section title="2. How We Use Your Information">
            <Item title="To operate the platform">Authenticating your account, publishing salary data and providing platform features.</Item>
            <Item title="To maintain data quality">Reviewing submissions for accuracy before publishing. Reviewers see submission content only, never your identity.</Item>
            <Item title="To communicate with you">Responding to support requests or sending important service notifications. We do not send marketing emails.</Item>
            <Item title="To improve the platform">Aggregated, anonymised usage patterns help us understand which features are most useful.</Item>
          </Section>

          <Section title="3. Anonymity of Salary Data">
            This is the most important part of our privacy commitment. When you submit a salary:
            <ul style={{ marginTop: 10, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Your name and email are never stored alongside the salary record.</li>
              <li>Your IP address is not recorded as part of the submission.</li>
              <li>The published entry contains only: company, role, level, location, compensation figures and submission date.</li>
              <li>Even our internal team cannot link a published salary entry back to your account after approval.</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing">
            We do not sell, rent or share your personal data with third parties for marketing purposes. We may share data in the following limited circumstances:
            <ul style={{ marginTop: 10, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>With service providers who operate our infrastructure (e.g. cloud hosting), under strict data processing agreements.</li>
              <li>If required by law or valid legal process.</li>
              <li>Anonymised, aggregated salary statistics may be shared publicly or with research partners.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <Item title="Account data">Retained while your account is active. Deleted within 30 days of account deletion request.</Item>
            <Item title="Salary submissions">Published salary data is retained indefinitely to maintain dataset quality. You may request removal of your submissions at any time.</Item>
            <Item title="Server logs">Retained for 90 days for security purposes, then deleted.</Item>
          </Section>

          <Section title="6. Your Rights">
            You have the right to access, correct or delete your personal data. To exercise these rights, email us at <a href="mailto:privacy@salaryinsights360.com" style={{ color: '#0ea5e9' }}>privacy@salaryinsights360.com</a>. We will respond within 30 days.
          </Section>

          <Section title="7. Cookies">
            We use only essential cookies required to keep you logged in. We do not use advertising or tracking cookies.
          </Section>

          <Section title="8. Security">
            Passwords are hashed using bcrypt. Data in transit is encrypted via HTTPS. We conduct regular security reviews and follow industry best practices.
          </Section>

          <Section title="9. Changes to This Policy">
            We may update this policy from time to time. We will notify registered users by email of any material changes. Continued use of the platform after changes constitutes acceptance.
          </Section>

          <Section title="10. Contact">
            Questions about this policy? Email us at <a href="mailto:privacy@salaryinsights360.com" style={{ color: '#0ea5e9' }}>privacy@salaryinsights360.com</a>.
          </Section>

        </div>
      </section>
    </div>
  );
}
