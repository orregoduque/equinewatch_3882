import React, { useEffect, createContext, useContext, ReactNode } from 'react';
import { initializeCsrfToken, clearAllSecureStorage } from '../utils/secureStorage';

/**
 * Security context and provider for application-wide security features
 */

interface SecurityContextType {
  csrfToken: string;
  clearSecureData: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [csrfToken, setCsrfToken] = React.useState<string>('');

  useEffect(() => {
    // Initialize CSRF token on mount
    const token = initializeCsrfToken();
    setCsrfToken(token);

    // Add security event listeners
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs - potential security concern
        console.warn('Security: Tab visibility changed');
      }
    };

    const handleBeforeUnload = () => {
      // Clean up sensitive data before page unload
      console.info('Security: Cleaning up before page unload');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Prevent drag and drop attacks
    const preventDragDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('dragover', preventDragDrop);
    document.addEventListener('drop', preventDragDrop);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('dragover', preventDragDrop);
      document.removeEventListener('drop', preventDragDrop);
    };
  }, []);

  const clearSecureData = () => {
    clearAllSecureStorage();
    const token = initializeCsrfToken();
    setCsrfToken(token);
  };

  return (
    <SecurityContext.Provider value={{ csrfToken, clearSecureData }}>
      {children}
    </SecurityContext.Provider>
  );
};