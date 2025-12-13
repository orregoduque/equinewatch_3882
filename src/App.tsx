import React from "react";
import Routes from "./Routes";

import { SecurityProvider } from './components/SecurityProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SecurityProvider>
          <Routes />
        </SecurityProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;