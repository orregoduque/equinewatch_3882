import React from "react";
import Routes from "./Routes";

import { SecurityProvider } from './components/SecurityProvider';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SecurityProvider>
        <Routes />
      </SecurityProvider>
    </ThemeProvider>
  );
};

export default App;