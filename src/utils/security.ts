import DOMPurify from 'dompurify';

/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Sanitize plain text input by removing all HTML tags
 */
export const sanitizeText = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Validate and sanitize email input
 */
export const sanitizeEmail = (email: string): string => {
  const sanitized = sanitizeText(email.trim().toLowerCase());
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 */
export const sanitizeUrl = (url: string): string => {
  const sanitized = sanitizeText(url.trim());
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = sanitized.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '#';
    }
  }
  
  // Ensure URL starts with http:// or https:// or is relative
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://') && !sanitized.startsWith('/')) {
    return `https://${sanitized}`;
  }
  
  return sanitized;
};

/**
 * Generate CSRF token for form submissions
 */
export const generateCsrfToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Rate limiting helper - simple client-side rate limiting
 */
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, config: RateLimitConfig): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }
  
  if (record.count >= config.maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
};

/**
 * Sanitize object keys and values to prevent prototype pollution
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    // Sanitize key
    const sanitizedKey = sanitizeText(key);
    
    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  
  return sanitized as T;
};

/**
 * Validate file upload to prevent malicious files
 */
export const validateFileUpload = (file: File, allowedTypes: string[], maxSizeMB: number): {
  isValid: boolean;
  error?: string;
} => {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must not exceed ${maxSizeMB}MB`,
    };
  }
  
  // Check file type
  const fileType = file.type.toLowerCase();
  const isAllowedType = allowedTypes.some(type => fileType.includes(type.toLowerCase()));
  
  if (!isAllowedType) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = allowedTypes.some(type => fileName.endsWith(`.${type.split('/')[1]}`));
  
  if (!hasAllowedExtension) {
    return {
      isValid: false,
      error: 'File extension does not match file type',
    };
  }
  
  return { isValid: true };
};

/**
 * Escape special characters for safe HTML rendering
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, char => map[char]);
};

/**
 * Validate numeric input to prevent injection
 */
export const sanitizeNumber = (input: string | number, min?: number, max?: number): number => {
  const num = typeof input === 'string' ? parseFloat(sanitizeText(input)) : input;
  
  if (isNaN(num)) {
    throw new Error('Invalid number format');
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Number must not exceed ${max}`);
  }
  
  return num;
};