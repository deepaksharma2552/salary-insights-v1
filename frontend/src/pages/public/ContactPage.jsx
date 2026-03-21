import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [sent, setSent] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Opens mailto as fallback — replace with API call when backend is ready
    const mailto = `mailto:support@salaryinsights360.com?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100vh' }}>
      <section style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="section-tag" style={{ display: 'block', marginBottom: 8 }}>Contact</span>
        <h1 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>Get in Touch</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 440, margin: '0 auto' }}>
          Have a question, found an issue or want to give feedback? We'd love to hear from you.
        </p>
      </section>

      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 32, alignItems: 'start' }}>

          {/* Contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '📧', title: 'Email', value: 'support@salaryinsights360.com', href: 'mailto:support@salaryinsights360.com' },
              { icon: '🐛', title: 'Report an issue', value: 'Found incorrect data or a bug? Let us know.', href: null },
              { icon: '💡', title: 'Feature request', value: 'Have an idea to make the platform better?', href: null },
              { icon: '🕐', title: 'Response time', value: 'We aim to respond within 48 hours.', href: null },
            ].map(({ icon, title, value, href }) => (
              <div key={title} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{title}</div>
                  {href ? (
                    <a href={href} style={{ fontSize: 12, color: '#0ea5e9', textDecoration: 'none' }}>{value}</a>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>{value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 28px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Message sent!</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Your email client should have opened. We'll get back to you within 48 hours.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" name="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-input" name="subject" value={form.subject} onChange={handleChange} style={{ cursor: 'pointer' }}>
                    <option value="general">General enquiry</option>
                    <option value="data-issue">Data issue / incorrect entry</option>
                    <option value="bug">Bug report</option>
                    <option value="feature">Feature request</option>
                    <option value="privacy">Privacy / data removal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-input" name="message" placeholder="Tell us what's on your mind…" value={form.message} onChange={handleChange} required rows={5} style={{ resize: 'vertical', minHeight: 120 }} />
                </div>
                <button type="submit" className="btn-auth" style={{ marginTop: 4 }}>Send Message →</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
