import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

const Landing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const howItWorks = [
    { step: '01', title: 'Install in Minutes', description: 'Portable mount with no wiring needed. Set up in any stall in under 5 minutes.', icon: 'Wrench' },
    { step: '02', title: 'AI Watches 24/7', description: 'Captures images continuously and analyzes behavior patterns using machine learning.', icon: 'Eye' },
    { step: '03', title: 'Get Smart Alerts', description: 'Receive instant notifications with image evidence when anomalies are detected.', icon: 'Bell' },
  ];

  const features = [
    { icon: 'Activity', title: 'Behavioral Analysis', description: 'Detects pacing, abnormal lying, distress signals, and subtle behavior changes.' },
    { icon: 'Moon', title: 'Night Vision', description: 'Crystal clear monitoring in complete darkness with infrared technology.' },
    { icon: 'Package', title: 'Portable Design', description: 'Easily move between stalls or take to shows and events.' },
    { icon: 'Smartphone', title: 'Smart Notifications', description: 'Mobile alerts with image evidence—know exactly what triggered the alert.' },
    { icon: 'TrendingUp', title: 'Historical Tracking', description: 'Pattern recognition over time to understand your horse\'s normal behavior.' },
    { icon: 'Users', title: 'Multi-Horse Management', description: 'Monitor your entire stable from one intuitive dashboard.' },
    { icon: 'Battery', title: 'Battery Backup', description: 'Continues working during power outages—never miss a critical moment.' },
    { icon: 'Lock', title: 'Privacy-First', description: 'Your data stays secure. Enterprise-grade encryption for all footage.' },
  ];

  const useCases = [
    { icon: 'Stethoscope', title: 'Post-Surgery Recovery', description: 'Monitor healing horses overnight without disturbing their rest.' },
    { icon: 'Plane', title: 'Competition Travel', description: 'Bring peace of mind to away shows. Keep watching even when you\'re not there.' },
    { icon: 'Baby', title: 'Foaling Season', description: 'Never miss critical moments during foaling. Instant alerts when labor begins.' },
    { icon: 'Heart', title: 'Senior Horse Care', description: 'Extra vigilance for aging companions who need more attention and care.' },
  ];

  const comparison = [
    { feature: '24/7 Coverage', manual: false, camera: true, stableEye: true },
    { feature: 'Intelligent Alerts', manual: false, camera: false, stableEye: true },
    { feature: 'Behavior Analysis', manual: false, camera: false, stableEye: true },
    { feature: 'No False Alarms', manual: true, camera: false, stableEye: true },
    { feature: 'Portable Setup', manual: true, camera: false, stableEye: true },
    { feature: 'Night Vision', manual: false, camera: true, stableEye: true },
    { feature: 'Historical Data', manual: false, camera: false, stableEye: true },
  ];

  const faqs = [
    { question: 'How is this different from a regular security camera?', answer: 'Unlike standard cameras that just record video, Stable Eye uses AI to actively analyze your horse\'s behavior. It understands normal patterns and only alerts you when something is truly wrong—eliminating the constant monitoring burden and false alarms.' },
    { question: 'What behaviors can it detect?', answer: 'Stable Eye detects early signs of colic (pawing, rolling, looking at flank), distress signals, abnormal lying patterns, reduced movement, changes in eating behavior, and other subtle indicators that something may be wrong.' },
    { question: 'How long does the battery last?', answer: 'The built-in battery provides up to 8 hours of backup power during outages. When connected to power, it runs continuously 24/7 with no interruption.' },
    { question: 'Will it work in my barn setup?', answer: 'Stable Eye works in virtually any barn environment. It\'s designed to handle dust, humidity, and temperature variations. The portable mount fits any stall configuration without permanent installation.' },
    { question: 'What happens if my internet goes down?', answer: 'The device continues monitoring and storing data locally. Once connection is restored, it syncs automatically. Critical alerts can also be sent via SMS backup if configured.' },
    { question: 'Can multiple people receive alerts?', answer: 'Yes! You can add unlimited team members to receive alerts. Perfect for farms with multiple caretakers or families sharing horse care responsibilities.' },
  ];

  return (
    <>
      <Helmet>
        <title>Stable Eye — AI-Powered Equine Health Monitoring</title>
        <meta name="description" content="AI-powered preventive infrastructure for the global equine industry. Detect colic, stress, and behavioral changes before they become emergencies." />
      </Helmet>

      <div style={{ backgroundColor: '#F8F6F2', color: '#40352C', fontFamily: 'Montserrat, sans-serif' }}>

        {/* NAV */}
        <header
          className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
          style={{
            backgroundColor: scrolled ? 'rgba(248,246,242,0.96)' : 'transparent',
            backdropFilter: scrolled ? 'blur(12px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(64,53,44,0.1)' : 'none',
          }}
        >
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                <img src="/logo-icon-dark.png" alt="Stable Eye" className="h-7 w-auto" />
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#40352C', letterSpacing: '-0.01em' }}>Stable Eye</span>
              </div>

              <nav className="hidden md:flex items-center gap-8">
                <a href="#how-it-works" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }} className="hover:opacity-100 transition-opacity text-xs font-medium tracking-wide">How It Works</a>
                <a href="#features" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }} className="hover:opacity-100 transition-opacity text-xs font-medium tracking-wide">Features</a>
                <a href="#faq" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }} className="hover:opacity-100 transition-opacity text-xs font-medium tracking-wide">FAQ</a>
              </nav>

              <Link
                to="/login"
                className="px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200"
                style={{
                  backgroundColor: '#40352C',
                  color: '#F8F6F2',
                  borderRadius: '4px',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative pt-24 pb-16 px-6" style={{ backgroundColor: '#F8F6F2' }}>
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1
                  className="font-bold leading-[1.08] mb-5 tracking-tight"
                  style={{ fontFamily: 'Syne, sans-serif', color: '#40352C', fontSize: 'clamp(28px, 4vw, 42px)' }}
                >
                  Never Miss a<br />Warning Sign
                </h1>

                <p className="text-sm leading-relaxed mb-3 font-medium" style={{ color: '#40352C', opacity: 0.7, fontFamily: 'Montserrat, sans-serif' }}>
                  AI-powered preventive infrastructure for the global equine industry
                </p>

                <p className="text-xs leading-relaxed mb-8 max-w-sm" style={{ color: '#40352C', opacity: 0.45, fontFamily: 'Montserrat, sans-serif' }}>
                  Portable camera system with intelligent alerts when your horse needs attention. Detect colic, stress, and abnormal behaviors before they become emergencies.
                </p>

                <div className="flex flex-wrap gap-3 mb-8">
                  <Link
                    to="/login"
                    className="px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: '#40352C',
                      color: '#F8F6F2',
                      borderRadius: '4px',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    Get Early Access
                  </Link>
                  <a
                    href="#how-it-works"
                    className="px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200"
                    style={{
                      border: '1px solid rgba(64,53,44,0.3)',
                      color: '#40352C',
                      borderRadius: '4px',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    See How It Works
                  </a>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <Icon name="Shield" size={13} className="text-green-600" />
                    <span className="text-xs" style={{ color: 'rgba(64,53,44,0.5)', fontFamily: 'Montserrat, sans-serif' }}>Veterinarian Approved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon name="Award" size={13} style={{ color: '#40352C' }} />
                    <span className="text-xs" style={{ color: 'rgba(64,53,44,0.5)', fontFamily: 'Montserrat, sans-serif' }}>30-Day Guarantee</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden shadow-xl" style={{ borderRadius: '6px' }}>
                  <img
                    src="/hero-horse.webp"
                    alt="Horse being monitored by Stable Eye device"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <div
                  className="absolute -bottom-4 -left-4 p-3.5 shadow-md"
                  style={{
                    backgroundColor: '#F8F6F2',
                    border: '1px solid rgba(64,53,44,0.12)',
                    borderRadius: '4px',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                      <Icon name="Shield" size={14} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Protected</p>
                      <p style={{ fontSize: '10px', color: 'rgba(64,53,44,0.5)', fontFamily: 'Montserrat, sans-serif' }}>24/7 Monitoring Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DIVIDER */}
        <div className="max-w-5xl mx-auto px-6">
          <div style={{ height: '1px', backgroundColor: 'rgba(64,53,44,0.1)' }} />
        </div>

        {/* PROBLEM */}
        <section style={{ backgroundColor: '#40352C', color: '#F8F6F2' }} className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 mb-7"
                  style={{
                    border: '1px solid rgba(248,246,242,0.2)',
                    borderRadius: '2px',
                    backgroundColor: 'rgba(248,246,242,0.05)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(248,246,242,0.6)', fontFamily: 'Montserrat, sans-serif' }}>The Problem</span>
                </div>

                <h2
                  className="font-bold leading-tight mb-5"
                  style={{ fontFamily: 'Syne, sans-serif', color: '#F8F6F2', fontSize: 'clamp(22px, 3vw, 34px)' }}
                >
                  You can't be there<br />every moment
                </h2>

                <p className="text-sm leading-relaxed mb-7" style={{ color: 'rgba(248,246,242,0.6)', fontFamily: 'Montserrat, sans-serif' }}>
                  Late-night colic episodes. Undetected injuries. Behavioral changes while you're away. Every horse owner knows the anxiety of not being able to constantly watch over their animals.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-7">
                  {[
                    { value: '920K+', label: 'Colic cases yearly in the US', highlight: '#F8F6F2' },
                    { value: '11%', label: 'Fatality rate without early detection', highlight: '#f87171' },
                    { value: '85%', label: 'Preventable with early care', highlight: '#4ade80' },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="p-4 text-center"
                      style={{
                        backgroundColor: 'rgba(248,246,242,0.05)',
                        border: '1px solid rgba(248,246,242,0.1)',
                        borderRadius: '4px',
                      }}
                    >
                      <p className="text-xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: stat.highlight }}>{stat.value}</p>
                      <p style={{ fontSize: '10px', lineHeight: '1.4', color: 'rgba(248,246,242,0.4)', fontFamily: 'Montserrat, sans-serif' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'rgba(248,246,242,0.5)', fontFamily: 'Montserrat, sans-serif' }}>
                  Colic is the <span style={{ color: '#F8F6F2', fontWeight: 600 }}>#1 cause of premature death</span> in horses—but it doesn't have to be. With the right monitoring, most cases can be caught and treated before they become life-threatening.
                </p>
              </div>

              <div>
                <div className="aspect-square overflow-hidden shadow-xl" style={{ borderRadius: '6px', border: '1px solid rgba(248,246,242,0.1)' }}>
                  <img
                    src="/iphone-mockup.webp"
                    alt="Stable Eye App showing horse monitoring alerts"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ backgroundColor: '#F8F6F2' }} className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(64,53,44,0.4)', fontFamily: 'Montserrat, sans-serif', marginBottom: '6px' }}>Process</p>
              <h2
                className="font-bold"
                style={{ fontFamily: 'Syne, sans-serif', color: '#40352C', fontSize: 'clamp(20px, 2.5vw, 28px)' }}
              >
                How It Works
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {howItWorks.map((step, index) => (
                <div
                  key={index}
                  className="p-6 transition-all duration-300"
                  style={{
                    border: '1px solid rgba(64,53,44,0.1)',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#40352C';
                    (e.currentTarget as HTMLElement).style.color = '#F8F6F2';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#40352C';
                  }}
                >
                  <p className="text-3xl font-bold mb-5 opacity-15" style={{ fontFamily: 'Syne, sans-serif' }}>{step.step}</p>
                  <div className="w-9 h-9 flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(64,53,44,0.08)', borderRadius: '4px' }}>
                    <Icon name={step.icon} size={18} style={{ color: 'currentColor' }} />
                  </div>
                  <h3 className="text-sm font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{step.title}</h3>
                  <p style={{ fontSize: '12px', lineHeight: '1.6', fontFamily: 'Montserrat, sans-serif', opacity: 0.55 }}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ backgroundColor: '#40352C' }} className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(248,246,242,0.3)', fontFamily: 'Montserrat, sans-serif', marginBottom: '6px' }}>Capabilities</p>
              <h2
                className="font-bold"
                style={{ fontFamily: 'Syne, sans-serif', color: '#F8F6F2', fontSize: 'clamp(20px, 2.5vw, 28px)' }}
              >
                Key Features
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-5"
                  style={{
                    border: '1px solid rgba(248,246,242,0.08)',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(248,246,242,0.04)',
                  }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(248,246,242,0.08)', borderRadius: '4px' }}
                  >
                    <Icon name={feature.icon} size={16} style={{ color: '#F8F6F2' }} />
                  </div>
                  <h3 className="text-xs font-bold mb-1.5" style={{ fontFamily: 'Syne, sans-serif', color: '#F8F6F2' }}>{feature.title}</h3>
                  <p style={{ fontSize: '11px', lineHeight: '1.6', color: 'rgba(248,246,242,0.4)', fontFamily: 'Montserrat, sans-serif' }}>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section style={{ backgroundColor: '#F8F6F2' }} className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(64,53,44,0.4)', fontFamily: 'Montserrat, sans-serif', marginBottom: '6px' }}>Use Cases</p>
              <h2
                className="font-bold"
                style={{ fontFamily: 'Syne, sans-serif', color: '#40352C', fontSize: 'clamp(20px, 2.5vw, 28px)' }}
              >
                Perfect For Every Scenario
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {useCases.map((useCase, index) => (
                <div
                  key={index}
                  className="p-5"
                  style={{
                    border: '1px solid rgba(64,53,44,0.1)',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(64,53,44,0.07)', borderRadius: '4px' }}
                  >
                    <Icon name={useCase.icon} size={16} style={{ color: '#40352C' }} />
                  </div>
                  <h3 className="text-xs font-bold mb-1.5" style={{ fontFamily: 'Syne, sans-serif', color: '#40352C' }}>{useCase.title}</h3>
                  <p style={{ fontSize: '11px', lineHeight: '1.6', color: 'rgba(64,53,44,0.5)', fontFamily: 'Montserrat, sans-serif' }}>{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI TECHNOLOGY */}
        <section style={{ backgroundColor: '#40352C' }} className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(248,246,242,0.3)', fontFamily: 'Montserrat, sans-serif', marginBottom: '6px' }}>AI Technology</p>
                <h2
                  className="font-bold leading-tight mb-5"
                  style={{ fontFamily: 'Syne, sans-serif', color: '#F8F6F2', fontSize: 'clamp(20px, 2.5vw, 30px)' }}
                >
                  Trained on 10,000+<br />Hours of Equine Behavior
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(248,246,242,0.5)', fontFamily: 'Montserrat, sans-serif' }}>
                  Our machine learning model has been developed in partnership with equine veterinarians and behavioral specialists. It understands what "normal" looks like for horses—and when something is wrong.
                </p>
                <ul className="space-y-3">
                  {[
                    'Trained on real stable footage from 200+ facilities',
                    'Validated by board-certified equine veterinarians',
                    '97% accuracy in detecting early colic indicators',
                    'Continuously learning and improving from new data',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0" style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}>
                        <Icon name="Check" size={10} className="text-green-400" />
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(248,246,242,0.55)', fontFamily: 'Montserrat, sans-serif' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="aspect-[4/3] overflow-hidden shadow-xl" style={{ borderRadius: '6px' }}>
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fhorse_outside.png&w=1200&q=75"
                    alt="Horse being analyzed by AI"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section style={{ backgroundColor: '#F8F6F2' }} className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(64,53,44,0.4)', fontFamily: 'Montserrat, sans-serif', marginBottom: '6px' }}>Comparison</p>
              <h2
                className="font-bold"
                style={{ fontFamily: 'Syne, sans-serif', color: '#40352C', fontSize: 'clamp(20px, 2.5vw, 28px)' }}
              >
                Compare Your Options
              </h2>
            </div>

            <div className="overflow-x-auto" style={{ border: '1px solid rgba(64,53,44,0.12)', borderRadius: '4px' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(64,53,44,0.1)', backgroundColor: 'rgba(64,53,44,0.03)' }}>
                    <th className="py-3 px-5 text-left" style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(64,53,44,0.45)', fontFamily: 'Montserrat, sans-serif' }}>Feature</th>
                    <th className="py-3 px-5 text-center" style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(64,53,44,0.45)', fontFamily: 'Montserrat, sans-serif' }}>Manual Checks</th>
                    <th className="py-3 px-5 text-center" style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(64,53,44,0.45)', fontFamily: 'Montserrat, sans-serif' }}>Standard Camera</th>
                    <th className="py-3 px-5 text-center" style={{ fontSize: '11px', fontWeight: 700, color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Stable Eye</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, index) => (
                    <tr key={index} style={{ borderBottom: index < comparison.length - 1 ? '1px solid rgba(64,53,44,0.07)' : 'none', backgroundColor: '#F8F6F2' }}>
                      <td className="py-3 px-5" style={{ fontSize: '12px', fontWeight: 500, color: '#40352C', fontFamily: 'Montserrat, sans-serif' }}>{row.feature}</td>
                      <td className="py-3 px-5 text-center">
                        {row.manual ? <Icon name="Check" size={15} className="text-green-600 mx-auto" /> : <Icon name="X" size={15} className="mx-auto" style={{ color: 'rgba(64,53,44,0.2)' }} />}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {row.camera ? <Icon name="Check" size={15} className="text-green-600 mx-auto" /> : <Icon name="X" size={15} className="mx-auto" style={{ color: 'rgba(64,53,44,0.2)' }} />}
                      </td>
                      <td className="py-3 px-5 text-center" style={{ backgroundColor: 'rgba(64,53,44,0.04)' }}>
                        {row.stableEye ? <Icon name="Check" size={15} className="text-green-600 mx-auto" /> : <Icon name="X" size={15} className="mx-auto" style={{ color: 'rgba(64,53,44,0.2)' }} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ backgroundColor: '#40352C' }} className="py-16 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-10">
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(248,246,242,0.3)', fontFamily: 'Montserrat, sans-serif', marginBottom: '6px' }}>FAQ</p>
              <h2
                className="font-bold"
                style={{ fontFamily: 'Syne, sans-serif', color: '#F8F6F2', fontSize: 'clamp(20px, 2.5vw, 28px)' }}
              >
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    border: '1px solid rgba(248,246,242,0.1)',
                    borderRadius: '4px',
                    backgroundColor: openFaq === index ? 'rgba(248,246,242,0.06)' : 'rgba(248,246,242,0.03)',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#F8F6F2', fontFamily: 'Montserrat, sans-serif', paddingRight: '1rem' }}>{faq.question}</span>
                    <Icon
                      name={openFaq === index ? 'ChevronUp' : 'ChevronDown'}
                      size={15}
                      style={{ color: 'rgba(248,246,242,0.4)', flexShrink: 0 }}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-4">
                      <p style={{ fontSize: '12px', lineHeight: '1.7', color: 'rgba(248,246,242,0.45)', fontFamily: 'Montserrat, sans-serif' }}>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ backgroundColor: '#40352C', borderTop: '1px solid rgba(248,246,242,0.08)' }} className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2
              className="font-bold mb-4 leading-tight"
              style={{ fontFamily: 'Syne, sans-serif', color: '#F8F6F2', fontSize: 'clamp(22px, 3vw, 34px)' }}
            >
              Give Your Horse the<br />Protection They Deserve
            </h2>
            <p className="text-sm mb-8 mx-auto" style={{ color: 'rgba(248,246,242,0.45)', fontFamily: 'Montserrat, sans-serif' }}>
              Join hundreds of horse owners who sleep better knowing their animals are protected. 30-day money-back guarantee.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Link
                to="/login"
                className="px-7 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: '#F8F6F2',
                  color: '#40352C',
                  borderRadius: '4px',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Get Early Access
              </Link>
              <Link
                to="/login"
                className="px-7 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200"
                style={{
                  border: '1px solid rgba(248,246,242,0.25)',
                  color: '#F8F6F2',
                  borderRadius: '4px',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Request Demo
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-6" style={{ color: 'rgba(248,246,242,0.35)', fontFamily: 'Montserrat, sans-serif', fontSize: '11px' }}>
              <div className="flex items-center gap-1.5">
                <Icon name="Shield" size={12} style={{ color: 'rgba(248,246,242,0.35)' }} />
                <span>30-Day Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="Zap" size={12} style={{ color: 'rgba(248,246,242,0.35)' }} />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="Headphones" size={12} style={{ color: 'rgba(248,246,242,0.35)' }} />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ backgroundColor: '#2a2219', borderTop: '1px solid rgba(248,246,242,0.06)' }} className="py-8 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-2.5">
                <img src="/logo-icon-dark.png" alt="Stable Eye" className="h-6 w-auto" style={{ filter: 'brightness(0) invert(1)', opacity: 0.6 }} />
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'rgba(248,246,242,0.6)', letterSpacing: '-0.01em' }}>Stable Eye</span>
              </div>

              <div className="flex items-center gap-6" style={{ fontSize: '11px', color: 'rgba(248,246,242,0.3)', fontFamily: 'Montserrat, sans-serif' }}>
                <a href="#how-it-works" className="hover:opacity-70 transition-opacity">How It Works</a>
                <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
                <a href="#faq" className="hover:opacity-70 transition-opacity">FAQ</a>
              </div>

              <p style={{ fontSize: '10px', color: 'rgba(248,246,242,0.2)', fontFamily: 'Montserrat, sans-serif' }}>
                © {new Date().getFullYear()} Stable Eye. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Landing;
