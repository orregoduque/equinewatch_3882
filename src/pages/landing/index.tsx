import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

const Landing: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const features = [
    { icon: 'Package', title: 'Portable', description: 'Lightweight and easy to move, perfect for monitoring horses in any location.' },
    { icon: 'Eye', title: 'Non-Intrusive', description: "Works quietly in the background without disturbing your horses' natural behavior." },
    { icon: 'Zap', title: 'Easy to Install', description: 'Set up in minutes with our simple installation process - no technical expertise required.' },
    { icon: 'Activity', title: 'Real-Time Monitoring', description: "Get instant alerts and continuous monitoring of your horse's behavior 24/7." },
    { icon: 'Battery', title: 'Rechargeable', description: 'Long-lasting battery life with convenient recharging options for continuous operation.' },
    { icon: 'Smile', title: 'User Friendly', description: 'Intuitive interface and simple controls designed for all horse owners and professionals.' },
  ];

  const team = [
    { name: 'Juan Jose Orrego', role: 'CEO', title: 'Electronic Engineer', image: 'https://www.stable-eye.co/_next/image?url=%2Fproducts%2FCEO.jpg&w=640&q=75' },
    { name: 'Valentina Hurtado', role: 'CFO', title: 'Architect', image: 'https://www.stable-eye.co/_next/image?url=%2Fproducts%2FCDO.jpeg&w=640&q=75' },
  ];

  return (
    <>
      <Helmet>
        <title>Stable Eye - Intelligent Equine Health Monitoring</title>
        <meta name="description" content="An intelligent, non-intrusive monitoring system that analyzes horses' behavior through images to ensure their health and safety 24/7." />
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
                <a href="#about" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">About</a>
                <a href="#team" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">Team</a>
                <Link to="/contact" className="text-[#a8a8a8] hover:text-[#c9a962] transition-colors">Contact</Link>
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
                  <span className="text-sm text-[#4a9d6b] font-medium">24/7 Health Monitoring</span>
                </div>
                
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-6">
                  An intelligent, <span className="text-[#c9a962] font-medium">non-intrusive</span> monitoring system
                </h1>
                
                <p className="text-lg text-[#a8a8a8] leading-relaxed mb-8">
                  Analyzes horses' behavior through images to ensure their health and safety 24/7. Early detection of colic, stress, and abnormal behaviors.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/login"
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold text-lg hover:shadow-[0_0_40px_rgba(201,169,98,0.4)] transition-all duration-300"
                  >
                    Get Started
                  </Link>
                  <a
                    href="#features"
                    className="px-8 py-4 rounded-xl border border-[#c9a962]/30 text-[#c9a962] font-medium text-lg hover:bg-[#c9a962]/10 transition-all duration-300"
                  >
                    Learn More
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#c9a962]/20 shadow-[0_0_60px_rgba(201,169,98,0.1)]">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fhorse_ground_2.png&w=1920&q=75"
                    alt="Horse being monitored"
                    className="w-full h-full object-cover"
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

        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                <span className="text-[#c9a962]">Features</span>
              </h2>
              <p className="text-[#a8a8a8] max-w-2xl mx-auto">
                Discover the key features that make our intelligent monitoring system the ideal solution for horse health and safety.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10 hover:border-[#c9a962]/30 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#c9a962]/10 flex items-center justify-center mb-4">
                    <Icon name={feature.icon} size={24} className="text-[#c9a962]" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-[#faf9f6] mb-2">{feature.title}</h3>
                  <p className="text-[#a8a8a8] text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 mb-6">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-sm font-semibold">Critical Health Issue</span>
                </div>
                
                <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
                  <span className="text-[#c9a962] font-medium">4 out of 10</span> horses suffer from colic every single year
                </h2>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[#c9a962]">920,000+</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Cases per year in the US alone</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-red-400">11%</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Fatality rate without early detection</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[#4a9d6b]">85%</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Preventable with early intervention</p>
                  </div>
                </div>

                <p className="text-[#a8a8a8] leading-relaxed mb-6">
                  Colic is the <span className="text-[#faf9f6] font-medium">#1 cause of premature death</span> in horses—a condition that can be prevented if owners notice the early signs in time. We've built a portable, smart, and easy-to-install device that monitors a horse's behavior while it's alone in the stall, detects subtle changes in habits, and sends real-time alerts to the owner's app.
                </p>
                <p className="text-[#a8a8a8] leading-relaxed">
                  The system is privacy-friendly, non-intrusive, and works autonomously, providing continuous insight into the horse's wellbeing. Our goal is to become the most widely used equine prevention device in the world.
                </p>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden border border-[#c9a962]/20">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fiphone.png&w=1080&q=75"
                    alt="Stable Eye App on iPhone"
                    className="w-full h-full object-contain bg-[#12121a] p-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                The late detection of <span className="text-[#c9a962]">health problems</span> in horses
              </h2>
              <p className="text-[#a8a8a8] max-w-3xl mx-auto leading-relaxed">
                Many owners and caretakers cannot constantly monitor their animals, which can lead to serious consequences such as undetected colic, injuries, or prolonged stress. Our solution enables continuous, non-intrusive, and automated monitoring inside the stall.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-serif text-2xl font-medium text-[#faf9f6] mb-4">Mission</h3>
                <p className="text-[#a8a8a8] leading-relaxed">
                  To protect and improve the health and well-being of horses through intelligent, non-intrusive technology that empowers caretakers with early insights, peace of mind, and actionable data—anywhere, anytime.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="font-serif text-2xl font-medium text-[#faf9f6] mb-4">Vision</h3>
                <p className="text-[#a8a8a8] leading-relaxed">
                  To become the global standard in equine health monitoring by leading the digital transformation of stables, ensuring that every horse—regardless of location or resources—has access to timely care and constant protection.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#c9a962]/20">
                  <img
                    src="https://www.stable-eye.co/_next/image?url=%2Fproducts%2Fhorse_outside.png&w=1200&q=75"
                    alt="Horse in field"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
                  Our <span className="text-[#c9a962] font-medium">Offer</span>
                </h2>
                <p className="text-[#a8a8a8] leading-relaxed mb-6">
                  An intelligent system that monitors the behavior of horses inside their stall, allowing early detection of health issues such as colic, stress, or abnormal behaviors. It works with cameras and proprietary algorithms, without the need for physical sensors on the animal.
                </p>
                <ul className="space-y-3">
                  {['Non-intrusive 24/7 monitoring', 'Real-time automatic alerts', 'Remote access from any device', 'Visual history of behavior', 'Portable and easy to install'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#c9a962]/20 flex items-center justify-center">
                        <Icon name="Check" size={12} className="text-[#c9a962]" />
                      </div>
                      <span className="text-[#a8a8a8]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="team" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Our <span className="text-[#c9a962]">Team</span>
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

        <section id="social" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#c9a962]/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#c9a962]/10 mb-6">
                <Icon name="Heart" size={32} className="text-[#c9a962]" />
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                Our <span className="text-[#c9a962]">Social Mission</span>
              </h2>
              <p className="text-[#a8a8a8] max-w-3xl mx-auto leading-relaxed text-lg">
                We believe every horse deserves protection from colic, regardless of where they live.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-[#c9a962]/20 text-center">
                <div className="flex justify-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#4a9d6b]/20 flex items-center justify-center">
                    <Icon name="Globe" size={24} className="text-[#4a9d6b]" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#c9a962]/20 flex items-center justify-center">
                    <Icon name="Users" size={24} className="text-[#c9a962]" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#4a9d6b]/20 flex items-center justify-center">
                    <Icon name="Gift" size={24} className="text-[#4a9d6b]" />
                  </div>
                </div>
                
                <h3 className="font-serif text-2xl md:text-3xl font-light text-[#faf9f6] mb-6">
                  Helping Stables in Developing Countries
                </h3>
                
                <p className="text-[#a8a8a8] leading-relaxed text-lg mb-8 max-w-2xl mx-auto">
                  Our vision is a world where all horses are safe from colic. That's why we're committed to providing monitoring devices <span className="text-[#c9a962] font-medium">completely free</span> to stables in developing countries that cannot afford them.
                </p>
                
                <p className="text-[#a8a8a8] leading-relaxed mb-8 max-w-2xl mx-auto">
                  With the support of our users and community, we will make this vision a reality. Every subscription helps us extend our reach to horses and caretakers who need it most.
                </p>

                <div className="flex flex-wrap justify-center gap-6">
                  <div className="flex items-center gap-2 text-[#c9a962]">
                    <Icon name="Check" size={20} />
                    <span>Free devices for those in need</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#c9a962]">
                    <Icon name="Check" size={20} />
                    <span>Community-powered mission</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#c9a962]">
                    <Icon name="Check" size={20} />
                    <span>Global horse protection</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold text-lg hover:shadow-[0_0_40px_rgba(201,169,98,0.4)] transition-all duration-300"
              >
                <Icon name="Mail" size={20} />
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#c9a962]/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a962] to-[#a88a45] flex items-center justify-center">
                  <Icon name="Eye" size={20} className="text-[#0a0a0f]" />
                </div>
                <span className="font-serif text-lg font-semibold text-[#faf9f6]">Stable Eye</span>
              </div>
              
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
