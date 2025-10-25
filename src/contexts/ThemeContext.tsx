import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tenant, ThemeObject } from '@/types';
import { useAuth } from './AuthContext';
import { hexToHSL } from '@/lib/utils';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  tenantTheme: ThemeObject | null;
  tenant: Tenant | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenantId } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [tenantTheme, setTenantTheme] = useState<ThemeObject | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // Fetch tenant theme
  useEffect(() => {
    if (!tenantId) {
      setTenantTheme(null);
      setTenant(null);
      return;
    }

    const fetchTenantTheme = async () => {
      try {
        const tenantRef = doc(db, 'tenants', tenantId);
        const tenantSnap = await getDoc(tenantRef);
        
        if (tenantSnap.exists()) {
          const tenantData = { id: tenantSnap.id, ...tenantSnap.data() } as Tenant;
          setTenant(tenantData);
          setTenantTheme(tenantData.themeObject);
        }
      } catch (error) {
        console.error('Error fetching tenant theme:', error);
      }
    };

    fetchTenantTheme();
  }, [tenantId]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove old theme
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Apply tenant theme if available
    if (tenantTheme) {
      const colors = theme === 'dark' ? tenantTheme.darkMode : tenantTheme.lightMode;
      
      // Apply CSS variables
      Object.entries(colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVar, value);
      });

      // Apply accent color as primary
      const accentHSL = hexToHSL(tenantTheme.accentColor);
      root.style.setProperty('--primary', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
      root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
      root.style.setProperty('--ring', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    }
  }, [theme, tenantTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const value = {
    theme,
    toggleTheme,
    tenantTheme,
    tenant,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
