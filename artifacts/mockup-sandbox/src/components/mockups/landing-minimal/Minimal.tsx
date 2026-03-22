const BROWN = '#40352C';
const CREAM = '#F8F6F2';

const steps = [
  { n: '01', title: 'Install in Minutes', desc: 'Portable mount. No wiring. Any stall in under 5 minutes.' },
  { n: '02', title: 'AI Watches 24/7', desc: 'Continuous image capture with behavioral pattern analysis.' },
  { n: '03', title: 'Get Smart Alerts', desc: 'Instant notifications with image evidence when anomalies appear.' },
];

const features = [
  'Behavioral analysis & colic detection',
  'Night vision & infrared imaging',
  'Portable, no-wiring installation',
  'Mobile alerts with image evidence',
  'Historical pattern tracking',
  'Multi-horse dashboard',
  'Battery backup during outages',
  'Enterprise-grade encryption',
];

const stats = [
  { value: '920K+', label: 'Colic cases yearly in the US' },
  { value: '11%', label: 'Fatality rate without early detection' },
  { value: '85%', label: 'Preventable with early care' },
];

export function Minimal() {
  return (
    <div style={{ backgroundColor: CREAM, color: BROWN, fontFamily: 'Montserrat, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <header style={{ padding: '0 48px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(64,53,44,0.08)` }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: BROWN, letterSpacing: '-0.01em' }}>
          Stable Eye
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <a href="#" style={{ fontSize: 13, fontWeight: 500, color: `rgba(64,53,44,0.5)`, textDecoration: 'none' }}>How It Works</a>
          <a href="#" style={{ fontSize: 13, fontWeight: 500, color: `rgba(64,53,44,0.5)`, textDecoration: 'none' }}>Features</a>
          <a href="#" style={{ fontSize: 13, fontWeight: 500, color: `rgba(64,53,44,0.5)`, textDecoration: 'none' }}>FAQ</a>
          <button style={{ backgroundColor: BROWN, color: CREAM, border: 'none', padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.01em' }}>
            Login
          </button>
        </div>
      </header>

      {/* HERO — full-width centered, no split layout */}
      <section style={{ padding: '120px 48px 100px', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(64,53,44,0.4)`, marginBottom: 32 }}>
          AI-Powered Equine Health Monitoring
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 72, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.02em', color: BROWN, margin: '0 0 28px' }}>
          Never Miss a<br />Warning Sign
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: `rgba(64,53,44,0.55)`, maxWidth: 520, margin: '0 auto 48px', fontWeight: 400 }}>
          Portable camera system with intelligent alerts when your horse needs attention. Detect colic, stress, and abnormal behaviors before they become emergencies.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{ backgroundColor: BROWN, color: CREAM, border: 'none', padding: '16px 36px', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.02em' }}>
            Get Early Access
          </button>
          <button style={{ backgroundColor: 'transparent', color: BROWN, border: `1.5px solid rgba(64,53,44,0.3)`, padding: '16px 36px', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.02em' }}>
            See How It Works
          </button>
        </div>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 40 }}>
          <span style={{ fontSize: 12, color: `rgba(64,53,44,0.45)`, fontWeight: 500 }}>✓ Veterinarian Approved</span>
          <span style={{ fontSize: 12, color: `rgba(64,53,44,0.45)`, fontWeight: 500 }}>✓ 30-Day Guarantee</span>
        </div>
      </section>

      {/* HERO IMAGE — full bleed, no card chrome */}
      <div style={{ padding: '0 48px 120px', maxWidth: 1100, margin: '0 auto' }}>
        <img
          src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fhorse_ground_2.png&w=1920&q=75"
          alt="Horse being monitored"
          style={{ width: '100%', aspectRatio: '16/7', objectFit: 'cover', display: 'block', borderRadius: 4 }}
        />
      </div>

      {/* STATS — inline horizontal rule style */}
      <section style={{ padding: '0 48px 120px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ borderTop: `1px solid rgba(64,53,44,0.12)`, paddingTop: 56, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ paddingRight: i < 2 ? 40 : 0, borderRight: i < 2 ? `1px solid rgba(64,53,44,0.1)` : 'none', marginRight: i < 2 ? 40 : 0 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 700, color: BROWN, margin: '0 0 8px', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 13, color: `rgba(64,53,44,0.5)`, lineHeight: 1.5, margin: 0, fontWeight: 400 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: '0 48px 120px', maxWidth: 860, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(64,53,44,0.4)`, marginBottom: 24 }}>The Problem</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 52, fontWeight: 700, color: BROWN, lineHeight: 1.1, margin: '0 0 24px' }}>
          You can't be there<br />every moment
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: `rgba(64,53,44,0.55)`, maxWidth: 600, margin: 0 }}>
          Late-night colic episodes. Undetected injuries. Behavioral changes while you're away. Colic is the <strong style={{ color: BROWN, fontWeight: 600 }}>#1 cause of premature death</strong> in horses — but most cases are preventable with early detection. Stable Eye watches so you don't have to.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '0 48px 120px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(64,53,44,0.4)`, marginBottom: 56 }}>How It Works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 24, paddingBottom: 48, borderBottom: i < steps.length - 1 ? `1px solid rgba(64,53,44,0.08)` : 'none', marginBottom: i < steps.length - 1 ? 48 : 0 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: `rgba(64,53,44,0.25)`, letterSpacing: '0.05em', paddingTop: 4 }}>{s.n}</span>
              <div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: BROWN, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 15, color: `rgba(64,53,44,0.55)`, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '0 48px 120px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(64,53,44,0.4)`, marginBottom: 56 }}>Features</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 64px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, paddingBottom: 20, borderBottom: `1px solid rgba(64,53,44,0.08)` }}>
              <span style={{ fontSize: 10, color: `rgba(64,53,44,0.3)`, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>—</span>
              <span style={{ fontSize: 14, color: `rgba(64,53,44,0.7)`, lineHeight: 1.5, fontWeight: 500 }}>{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px 120px', borderTop: `1px solid rgba(64,53,44,0.08)`, textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 700, color: BROWN, lineHeight: 1.1, margin: '0 0 20px' }}>
          Start monitoring<br />your horse today
        </h2>
        <p style={{ fontSize: 15, color: `rgba(64,53,44,0.5)`, marginBottom: 40, lineHeight: 1.7 }}>
          Join hundreds of horse owners who sleep better knowing their animals are watched.
        </p>
        <button style={{ backgroundColor: BROWN, color: CREAM, border: 'none', padding: '18px 44px', fontSize: 15, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.02em' }}>
          Get Early Access
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid rgba(64,53,44,0.08)`, padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: BROWN }}>Stable Eye</span>
        <span style={{ fontSize: 12, color: `rgba(64,53,44,0.4)` }}>© 2026 Stable Eye. All rights reserved.</span>
      </footer>
    </div>
  );
}
