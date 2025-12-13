import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    contact: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Contact form submitted:', formData);
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us - Stable Eye</title>
        <meta name="description" content="Get in touch with Stable Eye for inquiries about our equine health monitoring system." />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0f] text-[#faf9f6]">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-[#c9a962]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/#team" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a962] to-[#a88a45] flex items-center justify-center">
                  <Icon name="Eye" size={24} className="text-[#0a0a0f]" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold text-[#faf9f6]">Stable Eye</h1>
                  <p className="text-xs text-[#c9a962] tracking-widest uppercase">Premium Monitoring</p>
                </div>
              </Link>

              <Link
                to="/#team"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-[#c9a962]/20 text-[#a8a8a8] hover:text-[#c9a962] hover:border-[#c9a962]/40 transition-all duration-300"
              >
                <Icon name="ArrowLeft" size={18} />
                <span className="text-sm font-medium">Back</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">
                Contact <span className="text-[#c9a962]">Us</span>
              </h1>
              <p className="text-[#a8a8a8]">
                Have questions? We'd love to hear from you.
              </p>
            </div>

            {isSubmitted ? (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-[#4a9d6b]/30 text-center">
                <div className="w-16 h-16 rounded-full bg-[#4a9d6b]/20 flex items-center justify-center mx-auto mb-4">
                  <Icon name="Check" size={32} className="text-[#4a9d6b]" />
                </div>
                <h2 className="font-serif text-2xl font-medium text-[#faf9f6] mb-2">Message Sent!</h2>
                <p className="text-[#a8a8a8] mb-6">
                  Thank you for reaching out. We'll get back to you soon.
                </p>
                <Link
                  to="/#team"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold hover:shadow-[0_0_30px_rgba(201,169,98,0.3)] transition-all duration-300"
                >
                  <Icon name="ArrowLeft" size={18} />
                  Back to Home
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-white/[0.02] border border-[#c9a962]/10">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#faf9f6] mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/20 text-[#faf9f6] placeholder-[#6b6b6b] focus:outline-none focus:border-[#c9a962]/50 focus:ring-1 focus:ring-[#c9a962]/30 transition-all"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[#faf9f6] mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/20 text-[#faf9f6] placeholder-[#6b6b6b] focus:outline-none focus:border-[#c9a962]/50 focus:ring-1 focus:ring-[#c9a962]/30 transition-all resize-none"
                      placeholder="Your message..."
                    />
                  </div>

                  <div>
                    <label htmlFor="contact" className="block text-sm font-medium text-[#faf9f6] mb-2">
                      Email or Phone for Answer *
                    </label>
                    <input
                      type="text"
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/20 text-[#faf9f6] placeholder-[#6b6b6b] focus:outline-none focus:border-[#c9a962]/50 focus:ring-1 focus:ring-[#c9a962]/30 transition-all"
                      placeholder="your@email.com or +1 234 567 890"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold text-lg hover:shadow-[0_0_40px_rgba(201,169,98,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Icon name="Send" size={20} />
                        Send Message
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-sm text-[#6b6b6b] mt-6">
                  Messages will be sent to contact@stable-eye.co
                </p>
              </form>
            )}
          </div>
        </main>

        <footer className="py-8 px-4 border-t border-[#c9a962]/10">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm text-[#6b6b6b]">
              © {new Date().getFullYear()} Stable Eye. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Contact;
