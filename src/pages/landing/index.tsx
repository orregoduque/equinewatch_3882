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
    { name: 'Valentina Hurtado', role: 'COO', title: 'Architect', image: 'https://www.stable-eye.co/_next/image?url=%2Fproducts%2FCDO.jpeg&w=640&q=75' },
  ];

  return (
    <>
      <Helmet>
        <title>Stable Eye - AI-Powered Horse Monitoring | Never Miss a Warning Sign</title>
        <meta name="description" content="AI-powered portable camera system with intelligent alerts for your horse's health. Detect colic, stress, and behavioral changes before they become emergencies." />
      </Helmet>

      <div className="min-h-screen bg-white text-[#1C1917]">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E7E5E4]">
          <div className="max-w-7xl mx-auto px-6 lg:px-20">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C9A86A] to-[#8B7355] flex items-center justify-center shadow-sm">
                  <Icon name="Eye" size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-medium text-[#1C1917] tracking-wide">Stable Eye</h1>
                  <p className="text-[10px] text-[#8B7355] tracking-[0.2em] uppercase font-medium">Premium Monitoring</p>
                </div>
              </div>
              
              <nav className="hidden md:flex items-center gap-10">
                <a href="#features" className="text-[#57534E] hover:text-[#C9A86A] transition-colors text-sm font-medium">Features</a>
                <a href="#how-it-works" className="text-[#57534E] hover:text-[#C9A86A] transition-colors text-sm font-medium">How It Works</a>
                <a href="#testimonials" className="text-[#57534E] hover:text-[#C9A86A] transition-colors text-sm font-medium">Testimonials</a>
                <a href="#faq" className="text-[#57534E] hover:text-[#C9A86A] transition-colors text-sm font-medium">FAQ</a>
              </nav>

              <Link
                to="/login"
                className="px-6 py-2.5 rounded bg-[#C9A86A] text-white font-semibold text-sm hover:bg-[#8B7355] transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        <section className="relative pt-32 pb-24 lg:pb-32 px-6 lg:px-20 min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F5F4] border border-[#E7E5E4] mb-8">
                  <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                  <span className="text-xs text-[#16A34A] font-semibold uppercase tracking-wider">Trusted by 500+ Horse Owners</span>
                </div>
                
                <h1 className="font-serif text-5xl md:text-6xl lg:text-[64px] font-normal leading-[1.1] mb-6 tracking-tight">
                  Never Miss a{' '}
                  <span className="text-[#C9A86A]">Warning Sign</span>
                </h1>
                
                <p className="text-xl text-[#57534E] leading-relaxed mb-4 font-medium">
                  AI-powered preventive infrastructure for the global equine industry
                </p>
                
                <p className="text-lg text-[#A8A29E] leading-relaxed mb-10 max-w-lg">
                  Portable camera system with intelligent alerts when your horse needs attention. Detect colic, stress, and abnormal behaviors before they become emergencies.
                </p>

                <div className="flex flex-wrap gap-4 mb-10">
                  <Link
                    to="/login"
                    className="px-8 py-4 rounded bg-[#C9A86A] text-white font-semibold text-base hover:bg-[#8B7355] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Get Early Access
                  </Link>
                  <a
                    href="#how-it-works"
                    className="px-8 py-4 rounded border-2 border-[#C9A86A] text-[#C9A86A] font-semibold text-base hover:bg-[#C9A86A] hover:text-white transition-all duration-200"
                  >
                    See How It Works
                  </a>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <Icon name="Shield" size={18} className="text-[#16A34A]" />
                    <span className="text-sm text-[#57534E] font-medium">Veterinarian Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="Award" size={18} className="text-[#C9A86A]" />
                    <span className="text-sm text-[#57534E] font-medium">30-Day Guarantee</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fhorse_ground_2.png&w=1920&q=75"
                    alt="Horse being monitored by Stable Eye device"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 p-5 rounded-lg bg-white border border-[#E7E5E4] shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
                      <Icon name="Shield" size={24} className="text-[#16A34A]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917]">Protected</p>
                      <p className="text-xs text-[#A8A29E]">24/7 Monitoring Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-20 bg-[#FAFAF9]">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EA580C]/10 border border-[#EA580C]/20 mb-8">
                  <div className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
                  <span className="text-xs text-[#EA580C] font-semibold uppercase tracking-wider">The Problem</span>
                </div>
                
                <h2 className="font-serif text-4xl md:text-5xl font-normal leading-tight mb-6">
                  You can't be there{' '}
                  <span className="text-[#C9A86A]">every moment</span>
                </h2>
                
                <p className="text-lg text-[#57534E] leading-relaxed mb-8">
                  Late-night colic episodes. Undetected injuries. Behavioral changes while you're away. Every horse owner knows the anxiety of not being able to constantly watch over their animals.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-5 rounded-lg bg-white border border-[#E7E5E4] text-center shadow-sm">
                    <p className="text-2xl md:text-3xl font-bold text-[#C9A86A]">920K+</p>
                    <p className="text-xs text-[#A8A29E] mt-2 leading-tight">Colic cases yearly in the US</p>
                  </div>
                  <div className="p-5 rounded-lg bg-white border border-[#E7E5E4] text-center shadow-sm">
                    <p className="text-2xl md:text-3xl font-bold text-[#EA580C]">11%</p>
                    <p className="text-xs text-[#A8A29E] mt-2 leading-tight">Fatality rate without early detection</p>
                  </div>
                  <div className="p-5 rounded-lg bg-white border border-[#E7E5E4] text-center shadow-sm">
                    <p className="text-2xl md:text-3xl font-bold text-[#16A34A]">85%</p>
                    <p className="text-xs text-[#A8A29E] mt-2 leading-tight">Preventable with early care</p>
                  </div>
                </div>

                <p className="text-[#57534E] leading-relaxed">
                  Colic is the <span className="text-[#1C1917] font-semibold">#1 cause of premature death</span> in horses—but it doesn't have to be. With the right monitoring, most cases can be caught and treated before they become life-threatening.
                </p>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-lg overflow-hidden shadow-lg border border-[#E7E5E4]">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fiphone.png&w=1080&q=75"
                    alt="Stable Eye App showing horse monitoring alerts"
                    className="w-full h-full object-contain bg-[#FAFAF9] p-8"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24 px-6 lg:px-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                How It <span className="text-[#C9A86A]">Works</span>
              </h2>
              <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
                Simple setup. Powerful protection. Get started in minutes, not hours.
              </p>
            </div>

            <div className="relative">
              <div className="hidden md:block absolute top-20 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-[#C9A86A]/30" />
              
              <div className="grid md:grid-cols-3 gap-8">
                {howItWorks.map((step, index) => (
                  <div key={index} className="relative p-8 rounded-lg bg-white border border-[#E7E5E4] hover:border-[#C9A86A]/50 hover:shadow-[0_8px_24px_rgba(201,168,106,0.08)] transition-all duration-300">
                    <div className="absolute -top-5 left-8 w-10 h-10 rounded-full bg-[#C9A86A] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {step.step}
                    </div>
                    <div className="w-14 h-14 rounded-lg bg-[#C9A86A]/10 flex items-center justify-center mb-6 mt-4">
                      <Icon name={step.icon} size={28} className="text-[#C9A86A]" />
                    </div>
                    <h3 className="font-serif text-xl font-medium text-[#1C1917] mb-3">{step.title}</h3>
                    <p className="text-[#57534E] leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 px-6 lg:px-20 bg-[#FAFAF9]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                Key <span className="text-[#C9A86A]">Features</span>
              </h2>
              <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
                Everything you need to keep your horse safe, healthy, and monitored around the clock.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-lg bg-white border border-[#E7E5E4] hover:border-[#C9A86A]/50 hover:shadow-[0_8px_24px_rgba(201,168,106,0.08)] transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#C9A86A]/10 flex items-center justify-center mb-4 group-hover:bg-[#C9A86A]/20 transition-colors">
                    <Icon name={feature.icon} size={24} className="text-[#C9A86A]" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#1C1917] mb-2">{feature.title}</h3>
                  <p className="text-[#57534E] text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                Perfect For <span className="text-[#C9A86A]">Every Scenario</span>
              </h2>
              <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
                See how horse owners like you are using Stable Eye to protect their animals.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, index) => (
                <div key={index} className="p-6 rounded-lg bg-[#FAFAF9] border border-[#E7E5E4] hover:border-[#C9A86A]/50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-full bg-[#C9A86A]/10 flex items-center justify-center mb-4">
                    <Icon name={useCase.icon} size={24} className="text-[#C9A86A]" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#1C1917] mb-2">{useCase.title}</h3>
                  <p className="text-[#57534E] text-sm leading-relaxed">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-20 bg-[#FAFAF9]">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A86A]/10 border border-[#C9A86A]/20 mb-8">
                  <Icon name="Cpu" size={16} className="text-[#C9A86A]" />
                  <span className="text-xs text-[#C9A86A] font-semibold uppercase tracking-wider">AI Technology</span>
                </div>
                
                <h2 className="font-serif text-4xl md:text-5xl font-normal leading-tight mb-6">
                  Trained on <span className="text-[#C9A86A]">10,000+ Hours</span> of Equine Behavior
                </h2>
                
                <p className="text-lg text-[#57534E] leading-relaxed mb-8">
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
                      <div className="w-5 h-5 rounded-full bg-[#16A34A]/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Icon name="Check" size={12} className="text-[#16A34A]" />
                      </div>
                      <span className="text-[#57534E]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-lg border border-[#E7E5E4]">
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

        {/* Testimonials section hidden for now
        <section id="testimonials" className="py-24 px-6 lg:px-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                Trusted by <span className="text-[#C9A86A]">Horse Owners</span> Worldwide
              </h2>
              <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
                Real stories from real customers who trust Stable Eye to protect their horses.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-8 rounded-lg bg-[#FAFAF9] border-l-4 border-[#C9A86A]">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Icon key={i} name="Star" size={18} className="text-[#C9A86A] fill-[#C9A86A]" />
                    ))}
                  </div>
                  <div className="mb-6">
                    <span className="font-serif text-4xl text-[#C9A86A]/30">"</span>
                    <p className="text-[#57534E] leading-relaxed -mt-4 ml-4">{testimonial.quote}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A86A]/20 grayscale"
                      loading="lazy"
                    />
                    <div>
                      <p className="font-semibold text-[#1C1917]">{testimonial.name}</p>
                      <p className="text-sm text-[#A8A29E]">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        */}

        <section className="py-24 px-6 lg:px-20 bg-[#FAFAF9]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                Compare Your <span className="text-[#C9A86A]">Options</span>
              </h2>
              <p className="text-lg text-[#57534E] max-w-2xl mx-auto">
                See why Stable Eye outperforms traditional monitoring methods.
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#E7E5E4] bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E7E5E4] bg-[#FAFAF9]">
                    <th className="py-4 px-6 text-left text-[#57534E] font-medium text-sm">Feature</th>
                    <th className="py-4 px-6 text-center text-[#57534E] font-medium text-sm">Manual Checks</th>
                    <th className="py-4 px-6 text-center text-[#57534E] font-medium text-sm">Standard Camera</th>
                    <th className="py-4 px-6 text-center text-[#C9A86A] font-semibold text-sm">Stable Eye</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, index) => (
                    <tr key={index} className="border-b border-[#E7E5E4] last:border-b-0">
                      <td className="py-4 px-6 text-[#1C1917] font-medium">{row.feature}</td>
                      <td className="py-4 px-6 text-center">
                        {row.manual ? (
                          <Icon name="Check" size={20} className="text-[#16A34A] mx-auto" />
                        ) : (
                          <Icon name="X" size={20} className="text-[#A8A29E] mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.camera ? (
                          <Icon name="Check" size={20} className="text-[#16A34A] mx-auto" />
                        ) : (
                          <Icon name="X" size={20} className="text-[#A8A29E] mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-6 text-center bg-[#C9A86A]/5">
                        {row.stableEye ? (
                          <Icon name="Check" size={20} className="text-[#16A34A] mx-auto" />
                        ) : (
                          <Icon name="X" size={20} className="text-[#A8A29E] mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faq" className="py-24 px-6 lg:px-20 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                Frequently Asked <span className="text-[#C9A86A]">Questions</span>
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-[#E7E5E4] overflow-hidden bg-white"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-[#FAFAF9] transition-colors"
                  >
                    <span className="font-medium text-[#1C1917] pr-4">{faq.question}</span>
                    <Icon
                      name={openFaq === index ? 'ChevronUp' : 'ChevronDown'}
                      size={20}
                      className="text-[#C9A86A] flex-shrink-0"
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-[#57534E] leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="team" className="py-24 px-6 lg:px-20 bg-[#FAFAF9]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-normal mb-4">
                Meet Our <span className="text-[#C9A86A]">Team</span>
              </h2>
            </div>

            <div className="flex justify-center gap-12 flex-wrap">
              {team.map((member, index) => (
                <div key={index} className="text-center">
                  <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-[#C9A86A]/20 mb-4 mx-auto shadow-md">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-[#1C1917]">{member.name}</h3>
                  <p className="text-[#C9A86A] font-semibold text-sm">{member.role}</p>
                  <p className="text-sm text-[#A8A29E]">{member.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-20 bg-[#8B7355]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-4xl md:text-5xl font-normal mb-6 text-white">
              Give Your Horse the{' '}
              <span className="text-[#C9A86A]">Protection</span>{' '}
              They Deserve
            </h2>
            <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
              Join hundreds of horse owners who sleep better knowing their animals are protected. 30-day money-back guarantee.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <Link
                to="/login"
                className="px-8 py-4 rounded bg-[#C9A86A] text-white font-semibold text-base hover:bg-white hover:text-[#8B7355] transition-all duration-200 shadow-lg"
              >
                Get Early Access
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 rounded border-2 border-white text-white font-semibold text-base hover:bg-white hover:text-[#8B7355] transition-all duration-200"
              >
                Request Demo
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Icon name="Shield" size={16} className="text-[#C9A86A]" />
                <span>30-Day Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Zap" size={16} className="text-[#C9A86A]" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Headphones" size={16} className="text-[#C9A86A]" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-16 px-6 lg:px-20 bg-white border-t border-[#E7E5E4]">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C9A86A] to-[#8B7355] flex items-center justify-center">
                    <Icon name="Eye" size={20} className="text-white" />
                  </div>
                  <span className="font-serif text-lg font-medium text-[#1C1917]">Stable Eye</span>
                </div>
                <p className="text-sm text-[#A8A29E] leading-relaxed">
                  AI-powered equine health monitoring for discerning horse owners.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#1C1917] mb-4 text-sm uppercase tracking-wider">Product</h4>
                <ul className="space-y-3 text-sm text-[#57534E]">
                  <li><a href="#features" className="hover:text-[#C9A86A] transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-[#C9A86A] transition-colors">How It Works</a></li>
                  <li><a href="#testimonials" className="hover:text-[#C9A86A] transition-colors">Testimonials</a></li>
                  <li><a href="#faq" className="hover:text-[#C9A86A] transition-colors">FAQ</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#1C1917] mb-4 text-sm uppercase tracking-wider">Company</h4>
                <ul className="space-y-3 text-sm text-[#57534E]">
                  <li><a href="#team" className="hover:text-[#C9A86A] transition-colors">About Us</a></li>
                  <li><Link to="/contact" className="hover:text-[#C9A86A] transition-colors">Contact</Link></li>
                  <li><a href="#" className="hover:text-[#C9A86A] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-[#C9A86A] transition-colors">Terms of Service</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#1C1917] mb-4 text-sm uppercase tracking-wider">Connect</h4>
                <div className="flex gap-3">
                  <a href="#" className="w-10 h-10 rounded-lg bg-[#F5F5F4] flex items-center justify-center hover:bg-[#C9A86A]/10 transition-colors">
                    <Icon name="Instagram" size={18} className="text-[#57534E]" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-lg bg-[#F5F5F4] flex items-center justify-center hover:bg-[#C9A86A]/10 transition-colors">
                    <Icon name="Facebook" size={18} className="text-[#57534E]" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-lg bg-[#F5F5F4] flex items-center justify-center hover:bg-[#C9A86A]/10 transition-colors">
                    <Icon name="Linkedin" size={18} className="text-[#57534E]" />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#E7E5E4]">
              <p className="text-sm text-[#A8A29E]">
                © {new Date().getFullYear()} Stable Eye. All rights reserved.
              </p>
              <Link
                to="/login"
                className="px-6 py-2.5 rounded bg-[#C9A86A] text-white font-semibold text-sm hover:bg-[#8B7355] transition-all duration-200"
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
