import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import type { LoginFormData, LoginFormErrors } from '../types';
import { sanitizeEmail, sanitizeText, checkRateLimit } from '../../../utils/security';
import { initializeCsrfToken, getCsrfToken } from '../../../utils/secureStorage';

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

  // Initialize CSRF token on component mount
  useEffect(() => {
    initializeCsrfToken();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    // Sanitize and validate email
    try {
      const sanitizedEmail = sanitizeEmail(formData.email);
      if (!sanitizedEmail) {
        newErrors.email = 'Email is required';
      }
    } catch (error) {
      newErrors.email = error instanceof Error ? error.message : 'Invalid email format';
    }

    // Validate password
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
    
    // Rate limiting check
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
      // Sanitize inputs before submission
      const sanitizedData: LoginFormData = {
        email: sanitizeEmail(formData.email),
        password: sanitizeText(formData.password),
      };
      
      // Add CSRF token to request
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
    
    // Sanitize input on change
    const sanitizedValue = sanitizeText(value);
    
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    
    if (errors[name as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-md">
          <p className="text-sm text-error">{errors.general}</p>
        </div>
      )}

      <Input
        type="email"
        name="email"
        label="Email Address"
        placeholder="your@email.com"
        value={formData.email}
        onChange={handleInputChange}
        error={errors.email}
        required
        disabled={isLoading}
        className="transition-smooth"
      />

      <Input
        type="password"
        name="password"
        label="Password"
        placeholder="Enter your password"
        value={formData.password}
        onChange={handleInputChange}
        error={errors.password}
        required
        disabled={isLoading}
        className="transition-smooth"
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-sm font-medium text-secondary hover:text-text-primary transition-smooth"
          disabled={isLoading}
        >
          Forgot Password?
        </button>
      </div>

      <Button
        type="submit"
        variant="default"
        size="lg"
        fullWidth
        loading={isLoading}
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;