import React, { createContext, useEffect, useContext } from 'react';

export const AppContext = createContext({});

export function AppProvider({ children }) {
  useEffect(() => {
    // Ensure application always renders in light theme
    const root = document.documentElement;
    root.classList.remove('dark');
    try {
      localStorage.removeItem('learnspace_theme');
      localStorage.removeItem('theme');
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <AppContext.Provider value={{}}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
