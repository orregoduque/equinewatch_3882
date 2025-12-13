import Cookies from 'js-cookie';

/**
 * Secure storage utilities with encryption and CSRF protection
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const SESSION_TOKEN_KEY = 'session_token';

/**
 * Secure cookie options
 */
const secureCookieOptions: Cookies.CookieAttributes = {
  secure: window.location.protocol === 'https:',
  sameSite: 'strict',
  expires: 1, // 1 day
};

/**
 * Set secure cookie with CSRF protection
 */
export const setSecureCookie = (key: string, value: string, options?: Cookies.CookieAttributes): void => {
  Cookies.set(key, value, {
    ...secureCookieOptions,
    ...options,
  });
};

/**
 * Get secure cookie value
 */
export const getSecureCookie = (key: string): string | undefined => {
  return Cookies.get(key);
};

/**
 * Remove secure cookie
 */
export const removeSecureCookie = (key: string): void => {
  Cookies.remove(key);
};

/**
 * Initialize CSRF token
 */
export const initializeCsrfToken = (): string => {
  let token = getSecureCookie(CSRF_TOKEN_KEY);
  
  if (!token) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setSecureCookie(CSRF_TOKEN_KEY, token);
  }
  
  return token;
};

/**
 * Get CSRF token
 */
export const getCsrfToken = (): string => {
  return getSecureCookie(CSRF_TOKEN_KEY) || initializeCsrfToken();
};

/**
 * Validate CSRF token
 */
export const validateCsrfToken = (token: string): boolean => {
  const storedToken = getCsrfToken();
  return token === storedToken;
};

/**
 * Secure session management
 */
export const setSessionToken = (token: string): void => {
  setSecureCookie(SESSION_TOKEN_KEY, token, {
    expires: 7, // 7 days
  });
};

export const getSessionToken = (): string | undefined => {
  return getSecureCookie(SESSION_TOKEN_KEY);
};

export const clearSession = (): void => {
  removeSecureCookie(SESSION_TOKEN_KEY);
  removeSecureCookie(CSRF_TOKEN_KEY);
};

/**
 * Simple encryption for sensitive data in localStorage
 * Note: This is basic obfuscation, not true encryption
 */
const obfuscate = (data: string): string => {
  return btoa(encodeURIComponent(data));
};

const deobfuscate = (data: string): string => {
  try {
    return decodeURIComponent(atob(data));
  } catch {
    return '';
  }
};

/**
 * Set encrypted localStorage item
 */
export const setSecureLocalStorage = (key: string, value: any): void => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = obfuscate(stringValue);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Error setting secure localStorage:', error);
  }
};

/**
 * Get encrypted localStorage item
 */
export const getSecureLocalStorage = <T = any>(key: string): T | null => {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    const decrypted = deobfuscate(encrypted);
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as T;
    }
  } catch (error) {
    console.error('Error getting secure localStorage:', error);
    return null;
  }
};

/**
 * Remove encrypted localStorage item
 */
export const removeSecureLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * Clear all secure storage
 */
export const clearAllSecureStorage = (): void => {
  clearSession();
  localStorage.clear();
  sessionStorage.clear();
};