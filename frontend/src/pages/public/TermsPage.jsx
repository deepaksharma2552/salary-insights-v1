const LAST_UPDATED = 'March 2026';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100vh' }}>
      <section style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="section-tag" style={{ display: 'block', marginBottom: 8 }}>Legal</span>
        <h1 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Last updated: {LAST_UPDATED}</p>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 48px' }}>

          <Section title="Overview">
            These Terms of Service ("Terms") govern your use of SalaryInsights360 ("platform", "we", "us"). By accessing or using the platform, you agree to be bound by these Terms. If you do not agree, please do not use the platform.
          </Section>

          <Section title="1. Eligibility">
            You must be at least 18 years old to create an account. By using the platform you confirm you meet this requirement.
          </Section>

          <Section title="2. Acceptable Use">
            You agree to use the platform only for lawful purposes. You must not:
            <ul style={{ marginTop: 10, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Submit false, misleading or fabricated salary data.</li>
              <li>Attempt to identify or de-anonymise other users' submissions.</li>
              <li>Scrape or automatically extract data from the platform without written permission.</li>
              <li>Interfere with or disrupt the platform's infrastructure.</li>
              <li>Use the platform for commercial purposes, including selling data derived from it.</li>
              <li>Post referral links that are expired, fraudulent or for roles that do not exist.</li>
            </ul>
          </Section>

          <Section title="3. User Submissions">
            By submitting salary data, referrals or Launchpad content, you:
            <ul style={{ marginTop: 10, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Confirm the information is accurate to the best of your knowledge.</li>
              <li>Grant us a non-exclusive, royalty-free licence to store, process and display the content on the platform.</li>
              <li>Understand that salary submissions will be published anonymously and permanently (unless you request removal).</li>
              <li>Acknowledge that you are not violating any confidentiality obligations with your employer by sharing the data.</li>
            </ul>
          </Section>

          <Section title="4. Data Accuracy Disclaimer">
            Salary data on the platform is community-sourced and provided for informational purposes only. We make no warranties about the accuracy, completeness or fitness of the data for any particular purpose. Do not rely solely on this data for employment, financial or legal decisions.
          </Section>

          <Section title="5. Intellectual Property">
            The platform's design, code and original content are owned by SalaryInsights360. Community-submitted salary data remains the intellectual property of the community and is licensed to us as described in Section 3. You may not reproduce or distribute platform content without our written permission.
          </Section>

          <Section title="6. Account Termination">
            We reserve the right to suspend or terminate accounts that violate these Terms, submit fraudulent data or engage in behaviour that harms the community. You may delete your account at any time from your account settings.
          </Section>

          <Section title="7. Limitation of Liability">
            To the fullest extent permitted by law, SalaryInsights360 is not liable for any indirect, incidental or consequential damages arising from your use of the platform or reliance on its data.
          </Section>

          <Section title="8. Changes to Terms">
            We may update these Terms at any time. We will notify registered users by email of material changes. Continued use of the platform after changes constitutes acceptance of the new Terms.
          </Section>

          <Section title="9. Governing Law">
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.
          </Section>

          <Section title="10. Contact">
            Questions about these Terms? Email us at <a href="mailto:legal@salaryinsights360.com" style={{ color: '#0ea5e9' }}>legal@salaryinsights360.com</a>.
          </Section>

        </div>
      </section>
    </div>
  );
}
