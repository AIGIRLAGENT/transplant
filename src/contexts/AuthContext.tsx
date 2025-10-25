import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { TenantMember, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  role: UserRole | null;
  tenantMembers: TenantMember[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  selectTenant: (tenantId: string) => void;
  refreshTenantMembers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);

  // Fetch tenant memberships from custom claims
  const fetchTenantMembers = async (firebaseUser: User) => {
    try {
      // Get custom claims from token
      const idTokenResult = await firebaseUser.getIdTokenResult();
      const tenantsClaims = idTokenResult.claims.tenants as Record<string, any> | undefined;

      if (!tenantsClaims || Object.keys(tenantsClaims).length === 0) {
        console.warn('User has no tenant memberships in custom claims');
        setTenantMembers([]);
        return;
      }

      // Convert claims to TenantMember objects
      const members: TenantMember[] = Object.entries(tenantsClaims).map(([tid, data]) => ({
        id: firebaseUser.uid,
        userId: firebaseUser.uid,
        tenantId: tid,
        role: data.role as UserRole,
        active: data.active ?? true,
        doctorProfileId: data.doctorProfileId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setTenantMembers(members);

      // Don't auto-select here, let the separate useEffect handle it
    } catch (error) {
      console.error('Error fetching tenant members:', error);
    }
  };

  const selectTenant = (selectedTenantId: string) => {
    const member = tenantMembers.find(m => m.tenantId === selectedTenantId);
    if (member) {
      setTenantId(selectedTenantId);
      setRole(member.role);
      localStorage.setItem('selectedTenantId', selectedTenantId);
    }
  };

  // Separate effect to handle tenant selection after members are loaded
  useEffect(() => {
    if (tenantMembers.length > 0 && !tenantId) {
      // Try to restore last selected tenant
      const savedTenantId = localStorage.getItem('selectedTenantId');
      if (savedTenantId && tenantMembers.some(m => m.tenantId === savedTenantId)) {
        selectTenant(savedTenantId);
      } else if (tenantMembers.length === 1) {
        // Auto-select if only one tenant
        selectTenant(tenantMembers[0].tenantId);
      }
    }
  }, [tenantMembers, tenantId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await fetchTenantMembers(firebaseUser);
      } else {
        setTenantMembers([]);
        setTenantId(null);
        setRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setTenantId(null);
    setRole(null);
    localStorage.removeItem('selectedTenantId');
  };

  const refreshTenantMembers = async () => {
    if (user) {
      await fetchTenantMembers(user);
    }
  };

  const value = {
    user,
    loading,
    tenantId,
    role,
    tenantMembers,
    signIn,
    signUp,
    signOut,
    selectTenant,
    refreshTenantMembers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
