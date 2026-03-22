import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginFormData, LoginFormErrors } from '../types';
import { sanitizeEmail, sanitizeText, checkRateLimit } from '../../../utils/security';
import { initializeCsrfToken, getCsrfToken } from '../../../utils/secureStorage';
import Icon from '../../../components/AppIcon';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    initializeCsrfToken();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    try {
      const sanitizedEmail = sanitizeEmail(formData.email);
      if (!sanitizedEmail) {
        newErrors.email = 'Email is required';
      }
    } catch (error) {
      newErrors.email = error instanceof Error ? error.message : 'Invalid email format';
    }

    const sanitizedPassword = sanitizeText(formData.password);
    if (!sanitizedPassword.trim()) {
      newErrors.password = 'Password is required';
    } else if (sanitizedPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rateLimitKey = `login_${formData.email}`;
    if (!checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 })) {
      setErrors({
        general: 'Too many login attempts. Please try again in 15 minutes.',
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    try {
      const sanitizedData: LoginFormData = {
        email: sanitizeEmail(formData.email),
        password: sanitizeText(formData.password),
      };
      
      const csrfToken = getCsrfToken();
      
      await onSubmit({ ...sanitizedData, csrfToken } as any);
      navigate('/horse-list');
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Authentication failed. Please try again.',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeText(value);
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    
    if (errors[name as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(199,80,80,0.08)', border: '1px solid rgba(199,80,80,0.25)' }}>
          <p className="text-sm whitespace-pre-line" style={{ color: '#c75050' }}>{errors.general}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-semibold tracking-wide mb-2" style={{ color: 'rgba(64,53,44,0.7)', fontFamily: 'Montserrat, sans-serif' }}>
          Email Address <span style={{ color: '#c75050' }}>*</span>
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: focusedField === 'email' ? '#40352C' : 'rgba(64,53,44,0.4)' }}>
            <Icon name="Mail" size={18} />
          </div>
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleInputChange}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            disabled={isLoading}
            className={`w-full h-10 pl-10 pr-4 luxury-input rounded-xl focus:outline-none ${errors.email ? 'border-[#c75050]' : ''}`}
            style={{ color: '#40352C', fontFamily: 'Montserrat, sans-serif' }}
          />
        </div>
        {errors.email && <p className="text-sm mt-1" style={{ color: '#c75050' }}>{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold tracking-wide mb-2" style={{ color: 'rgba(64,53,44,0.7)', fontFamily: 'Montserrat, sans-serif' }}>
          Password <span style={{ color: '#c75050' }}>*</span>
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: focusedField === 'password' ? '#40352C' : 'rgba(64,53,44,0.4)' }}>
            <Icon name="Lock" size={18} />
          </div>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            disabled={isLoading}
            className={`w-full h-10 pl-10 pr-4 luxury-input rounded-xl focus:outline-none ${errors.password ? 'border-[#c75050]' : ''}`}
            style={{ color: '#40352C', fontFamily: 'Montserrat, sans-serif' }}
          />
        </div>
        {errors.password && <p className="text-sm mt-1" style={{ color: '#c75050' }}>{errors.password}</p>}
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-sm font-medium transition-colors duration-300"
          style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}
          disabled={isLoading}
        >
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 luxury-button rounded-xl text-sm font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Signing In...</span>
          </>
        ) : (
          <>
            <span>Enter Stable Eye</span>
            <Icon name="ArrowRight" size={18} />
          </>
        )}
      </button>
    </form>
  );
};

export default LoginForm;
