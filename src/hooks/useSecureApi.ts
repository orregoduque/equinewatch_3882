import { useState, useCallback } from 'react';
import { getCsrfToken } from '../utils/secureStorage';
import { sanitizeObject } from '../utils/security';

/**
 * Secure API hook with CSRF protection and request sanitization
 */

interface UseSecureApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  sanitizeRequest?: boolean;
}

interface UseSecureApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (url: string, body?: any, options?: UseSecureApiOptions) => Promise<T | null>;
  reset: () => void;
}

export const useSecureApi = <T = any>(): UseSecureApiResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (
    url: string,
    body?: any,
    options: UseSecureApiOptions = {}
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const {
        method = 'GET',
        headers = {},
        sanitizeRequest = true,
      } = options;

      // Prepare secure headers
      const secureHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...headers,
      };

      // Sanitize request body if enabled
      const sanitizedBody = sanitizeRequest && body ? sanitizeObject(body) : body;

      // Make secure API request
      const response = await fetch(url, {
        method,
        headers: secureHeaders,
        body: method !== 'GET' && sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
        credentials: 'same-origin', // Send cookies only to same origin
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error('Unknown API error');
      setError(apiError);
      console.error('Secure API Error:', apiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};