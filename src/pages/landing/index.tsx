import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

const Landing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const howItWorks = [
    { step: '1', title: 'Install in Minutes', description: 'Portable mount with no wiring needed. Set up in any stall in under 5 minutes.', icon: 'Wrench' },
    { step: '2', title: 'AI Watches 24/7', description: 'Captures images continuously and analyzes behavior patterns using machine learning.', icon: 'Eye' },
    { step: '3', title: 'Get Smart Alerts', description: 'Receive instant notifications with image evidence when anomalies are detected.', icon: 'Bell' },
  ];

  const features = [
    { icon: 'Activity', title: 'Behavioral Analysis', description: 'Detects pacing, abnormal lying down, distress signals, and subtle behavior changes.' },
    { icon: 'Moon', title: 'Night Vision', description: 'Crystal clear monitoring in complete darkness with infrared technology.' },
    { icon: 'Package', title: 'Portable Design', description: 'Easily move between stalls or take to shows and events.' },
    { icon: 'Smartphone', title: 'Smart Notifications', description: 'Mobile alerts with image evidence—know exactly what triggered the alert.' },
    { icon: 'TrendingUp', title: 'Historical Tracking', description: 'Pattern recognition over time to understand your horse\'s normal behavior.' },
    { icon: 'Users', title: 'Multi-Horse Management', description: 'Monitor your entire stable from one intuitive dashboard.' },
    { icon: 'Battery', title: 'Battery Backup', description: 'Continues working during power outages—never miss a critical moment.' },
    { icon: 'Lock', title: 'Privacy-First', description: 'Your data stays secure. Enterprise-grade encryption for all footage.' },
  ];

  const useCases = [
    { icon: 'Stethoscope', title: 'Post-Surgery Recovery', description: 'Monitor healing horses overnight without disturbing their rest. Get alerts if they show signs of distress.' },
    { icon: 'Plane', title: 'Competition Travel', description: 'Bring peace of mind to away shows. Keep watching even when you\'re not there.' },
    { icon: 'Baby', title: 'Foaling Season', description: 'Never miss critical moments during foaling. Instant alerts when labor begins.' },
    { icon: 'Heart', title: 'Senior Horse Care', description: 'Extra vigilance for aging companions who need more attention and care.' },
  ];

  const testimonials = [
    { name: 'Sarah Mitchell', role: 'Dressage Professional', quote: 'Stable Eye caught early colic signs at 2 AM. My vet said if we\'d waited until morning, it would have been too late. This device saved my horse\'s life.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
    { name: 'James Richardson', role: 'Breeding Farm Owner', quote: 'We monitor 40+ horses with Stable Eye. The reduction in false alarms compared to standard cameras is remarkable. Our staff can finally sleep.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
    { name: 'Dr. Emily Chen', role: 'Equine Veterinarian', quote: 'I recommend Stable Eye to all my clients. The behavioral data helps me diagnose issues faster and more accurately.', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop' },
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

  const team = [
    { name: 'Juan Jose Orrego', role: 'CEO', title: 'Electronic Engineer', image: 'https://www.stable-eye.co/_next/image?url=%2Fproducts%2FCEO.jpg&w=640&q=75' },
    { name: 'Valentina Hurtado', role: 'CFO', title: 'Architect', image: 'https://www.stable-eye.co/_next/image?url=%2Fproducts%2FCDO.jpeg&w=640&q=75' },
  ];

  return (
    <>
      <Helmet>
        <title>Stable Eye - AI-Powered Horse Monitoring | Never Miss a Warning Sign</title>
        <meta name="description" content="AI-powered portable camera system with intelligent alerts for your horse's health. Detect colic, stress, and behavioral changes before they become emergencies." />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0f] text-[#faf9f6]">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-[#c9a962]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a962] to-[#a88a45] flex items-center justify-center">
                  <Icon name="Eye" size={24} className="text-[#0a0a0f]" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold text-[#faf9f6]">Stable Eye</h1>
                  <p className="text-xs text-[#c9a962] tracking-widest uppercase">Premium Monitoring</p>
                </div>
              </div>
              
              <nav className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">Features</a>
                <a href="#how-it-works" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">How It Works</a>
                <a href="#testimonials" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">Testimonials</a>
                <a href="#faq" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">FAQ</a>
              </nav>

              <Link
                to="/login"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold hover:shadow-[0_0_30px_rgba(201,169,98,0.3)] transition-all duration-300"
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#c9a962]/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c9a962]/3 rounded-full blur-[150px]" />
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#4a9d6b] animate-pulse" />
                  <span className="text-sm text-[#4a9d6b] font-medium">Trusted by 500+ Horse Owners</span>
                </div>
                
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-6">
                  Never Miss a <span className="text-[#c9a962] font-medium">Warning Sign</span>
                </h1>
                
                <p className="text-xl text-[#a8a8a8] leading-relaxed mb-4">
                  AI-Powered Monitoring for Your Horse's Health
                </p>
                
                <p className="text-lg text-[#6b6b6b] leading-relaxed mb-8">
                  Portable camera system with intelligent alerts when your horse needs attention. Detect colic, stress, and abnormal behaviors before they become emergencies.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link
                    to="/login"
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold text-lg hover:shadow-[0_0_40px_rgba(201,169,98,0.4)] transition-all duration-300"
                  >
                    Get Early Access
                  </Link>
                  <a
                    href="#how-it-works"
                    className="px-8 py-4 rounded-xl border border-[#c9a962]/30 text-[#c9a962] font-medium text-lg hover:bg-[#c9a962]/10 transition-all duration-300"
                  >
                    See How It Works
                  </a>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Icon name="Shield" size={18} className="text-[#4a9d6b]" />
                    <span className="text-sm text-[#a8a8a8]">Veterinarian Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="Award" size={18} className="text-[#c9a962]" />
                    <span className="text-sm text-[#a8a8a8]">30-Day Guarantee</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#c9a962]/20 shadow-[0_0_60px_rgba(201,169,98,0.1)]">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fhorse_ground_2.png&w=1920&q=75"
                    alt="Horse being monitored by Stable Eye device"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 p-4 rounded-xl bg-[#12121a] border border-[#c9a962]/20 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4a9d6b]/20 flex items-center justify-center">
                      <Icon name="Shield" size={20} className="text-[#4a9d6b]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#faf9f6]">Protected</p>
                      <p className="text-xs text-[#6b6b6b]">24/7 Monitoring Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 mb-6">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-sm font-semibold">The Problem</span>
                </div>
                
                <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
                  You can't be there <span className="text-[#c9a962] font-medium">every moment</span>
                </h2>
                
                <p className="text-[#a8a8a8] leading-relaxed mb-6 text-lg">
                  Late-night colic episodes. Undetected injuries. Behavioral changes while you're away. Every horse owner knows the anxiety of not being able to constantly watch over their animals.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[#c9a962]">920K+</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Colic cases yearly in the US</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-red-400">11%</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Fatality rate without early detection</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[#4a9d6b]">85%</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Preventable with early care</p>
                  </div>
                </div>

                <p className="text-[#a8a8a8] leading-relaxed">
                  Colic is the <span className="text-[#faf9f6] font-medium">#1 cause of premature death</span> in horses—but it doesn't have to be. With the right monitoring, most cases can be caught and treated before they become life-threatening.
                </p>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden border border-[#c9a962]/20">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fiphone.png&w=1080&q=75"
                    alt="Stable Eye App showing horse monitoring alerts"
                    className="w-full h-full object-contain bg-[#12121a] p-8"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                How It <span className="text-[#c9a962]">Works</span>
              </h2>
              <p className="text-[#a8a8a8] max-w-2xl mx-auto text-lg">
                Simple setup. Powerful protection. Get started in minutes, not hours.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="relative p-8 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10 hover:border-[#c9a962]/30 transition-all duration-300">
                  <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a962] to-[#a88a45] flex items-center justify-center text-[#0a0a0f] font-bold text-lg">
                    {step.step}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-[#c9a962]/10 flex items-center justify-center mb-6 mt-2">
                    <Icon name={step.icon} size={28} className="text-[#c9a962]" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-[#faf9f6] mb-3">{step.title}</h3>
                  <p className="text-[#a8a8a8] leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Key <span className="text-[#c9a962]">Features</span>
              </h2>
              <p className="text-[#a8a8a8] max-w-2xl mx-auto text-lg">
                Everything you need to keep your horse safe, healthy, and monitored around the clock.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10 hover:border-[#c9a962]/30 hover:bg-white/[0.04] transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#c9a962]/10 flex items-center justify-center mb-4 group-hover:bg-[#c9a962]/20 transition-colors">
                    <Icon name={feature.icon} size={24} className="text-[#c9a962]" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#faf9f6] mb-2">{feature.title}</h3>
                  <p className="text-[#a8a8a8] text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Perfect For <span className="text-[#c9a962]">Every Scenario</span>
              </h2>
              <p className="text-[#a8a8a8] max-w-2xl mx-auto text-lg">
                See how horse owners like you are using Stable Eye to protect their animals.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, index) => (
                <div key={index} className="p-6 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10 hover:border-[#c9a962]/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-full bg-[#c9a962]/10 flex items-center justify-center mb-4">
                    <Icon name={useCase.icon} size={24} className="text-[#c9a962]" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#faf9f6] mb-2">{useCase.title}</h3>
                  <p className="text-[#a8a8a8] text-sm leading-relaxed">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c9a962]/10 border border-[#c9a962]/30 mb-6">
                  <Icon name="Cpu" size={16} className="text-[#c9a962]" />
                  <span className="text-[#c9a962] text-sm font-medium">AI Technology</span>
                </div>
                
                <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
                  Trained on <span className="text-[#c9a962] font-medium">10,000+ Hours</span> of Equine Behavior
                </h2>
                
                <p className="text-[#a8a8a8] leading-relaxed mb-6 text-lg">
                  Our machine learning model has been developed in partnership with equine veterinarians and behavioral specialists. It understands what "normal" looks like for horses—and when something is wrong.
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    'Trained on real stable footage from 200+ facilities',
                    'Validated by board-certified equine veterinarians',
                    '97% accuracy in detecting early colic indicators',
                    'Continuously learning and improving from new data'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#4a9d6b]/20 flex items-center justify-center mt-0.5">
                        <Icon name="Check" size={12} className="text-[#4a9d6b]" />
                      </div>
                      <span className="text-[#a8a8a8]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#c9a962]/20">
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

        <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Trusted by <span className="text-[#c9a962]">Horse Owners</span> Worldwide
              </h2>
              <p className="text-[#a8a8a8] max-w-2xl mx-auto text-lg">
                Real stories from real customers who trust Stable Eye to protect their horses.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-8 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Icon key={i} name="Star" size={18} className="text-[#c9a962] fill-[#c9a962]" />
                    ))}
                  </div>
                  <p className="text-[#a8a8a8] leading-relaxed mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div>
                      <p className="font-medium text-[#faf9f6]">{testimonial.name}</p>
                      <p className="text-sm text-[#6b6b6b]">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Compare Your <span className="text-[#c9a962]">Options</span>
              </h2>
              <p className="text-[#a8a8a8] max-w-2xl mx-auto text-lg">
                See why Stable Eye outperforms traditional monitoring methods.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#c9a962]/20">
                    <th className="py-4 px-6 text-left text-[#a8a8a8] font-normal">Feature</th>
                    <th className="py-4 px-6 text-center text-[#a8a8a8] font-normal">Manual Checks</th>
                    <th className="py-4 px-6 text-center text-[#a8a8a8] font-normal">Standard Camera</th>
                    <th className="py-4 px-6 text-center text-[#c9a962] font-semibold">Stable Eye</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-4 px-6 text-[#faf9f6]">{row.feature}</td>
                      <td className="py-4 px-6 text-center">
                        {row.manual ? (
                          <Icon name="Check" size={20} className="text-[#4a9d6b] mx-auto" />
                        ) : (
                          <Icon name="X" size={20} className="text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.camera ? (
                          <Icon name="Check" size={20} className="text-[#4a9d6b] mx-auto" />
                        ) : (
                          <Icon name="X" size={20} className="text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.stableEye ? (
                          <Icon name="Check" size={20} className="text-[#4a9d6b] mx-auto" />
                        ) : (
                          <Icon name="X" size={20} className="text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Frequently Asked <span className="text-[#c9a962]">Questions</span>
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#c9a962]/10 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-medium text-[#faf9f6] pr-4">{faq.question}</span>
                    <Icon
                      name={openFaq === index ? 'ChevronUp' : 'ChevronDown'}
                      size={20}
                      className="text-[#c9a962] flex-shrink-0"
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-[#a8a8a8] leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="team" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Meet Our <span className="text-[#c9a962]">Team</span>
              </h2>
            </div>

            <div className="flex justify-center gap-8 flex-wrap">
              {team.map((member, index) => (
                <div key={index} className="text-center">
                  <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#c9a962]/20 mb-4 mx-auto">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-[#faf9f6]">{member.name}</h3>
                  <p className="text-[#c9a962] font-medium">{member.role}</p>
                  <p className="text-sm text-[#6b6b6b]">{member.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-[#c9a962]/10 to-transparent border border-[#c9a962]/20 text-center">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Give Your Horse the <span className="text-[#c9a962]">Protection</span> They Deserve
              </h2>
              <p className="text-[#a8a8a8] text-lg mb-8 max-w-2xl mx-auto">
                Join hundreds of horse owners who sleep better knowing their animals are protected. 30-day money-back guarantee.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Link
                  to="/login"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold text-lg hover:shadow-[0_0_40px_rgba(201,169,98,0.4)] transition-all duration-300"
                >
                  Get Early Access
                </Link>
                <Link
                  to="/contact"
                  className="px-8 py-4 rounded-xl border border-[#c9a962]/30 text-[#c9a962] font-medium text-lg hover:bg-[#c9a962]/10 transition-all duration-300"
                >
                  Request Demo
                </Link>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-[#a8a8a8]">
                <div className="flex items-center gap-2">
                  <Icon name="Shield" size={16} className="text-[#4a9d6b]" />
                  <span>30-Day Money-Back Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Zap" size={16} className="text-[#c9a962]" />
                  <span>Free Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Headphones" size={16} className="text-[#c9a962]" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#c9a962]/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a962] to-[#a88a45] flex items-center justify-center">
                    <Icon name="Eye" size={20} className="text-[#0a0a0f]" />
                  </div>
                  <span className="font-serif text-lg font-semibold text-[#faf9f6]">Stable Eye</span>
                </div>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">
                  AI-powered equine health monitoring for discerning horse owners.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-[#faf9f6] mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-[#6b6b6b]">
                  <li><a href="#features" className="hover:text-[#c9a962] transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-[#c9a962] transition-colors">How It Works</a></li>
                  <li><a href="#testimonials" className="hover:text-[#c9a962] transition-colors">Testimonials</a></li>
                  <li><a href="#faq" className="hover:text-[#c9a962] transition-colors">FAQ</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-[#faf9f6] mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-[#6b6b6b]">
                  <li><a href="#team" className="hover:text-[#c9a962] transition-colors">About Us</a></li>
                  <li><Link to="/contact" className="hover:text-[#c9a962] transition-colors">Contact</Link></li>
                  <li><a href="#" className="hover:text-[#c9a962] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-[#c9a962] transition-colors">Terms of Service</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-[#faf9f6] mb-4">Connect</h4>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-[#c9a962]/20 transition-colors">
                    <Icon name="Instagram" size={20} className="text-[#a8a8a8]" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-[#c9a962]/20 transition-colors">
                    <Icon name="Facebook" size={20} className="text-[#a8a8a8]" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-[#c9a962]/20 transition-colors">
                    <Icon name="Linkedin" size={20} className="text-[#a8a8a8]" />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#c9a962]/10">
              <p className="text-sm text-[#6b6b6b]">
                © {new Date().getFullYear()} Stable Eye. All rights reserved.
              </p>
              <Link
                to="/login"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold hover:shadow-[0_0_30px_rgba(201,169,98,0.3)] transition-all duration-300"
              >
                Login to App
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
