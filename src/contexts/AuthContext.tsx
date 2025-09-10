import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let sessionRefreshTimer: NodeJS.Timeout | null = null;

    // Function to safely update state only if component is mounted
    const safeSetState = (newSession: Session | null) => {
      if (!mounted) return;
      
      // Only update if session actually changed
      if (newSession?.access_token !== session?.access_token) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
      setLoading(false);
    };

    // Set up auth state listener with better handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Ignore token refresh events to prevent unnecessary re-renders
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === newSession?.user?.id) {
          return;
        }
        
        safeSetState(newSession);
        
        // Set up proactive session refresh before expiry
        if (newSession?.expires_at) {
          const expiresAt = new Date(newSession.expires_at * 1000);
          const refreshTime = expiresAt.getTime() - Date.now() - (5 * 60 * 1000); // Refresh 5 minutes before expiry
          
          if (sessionRefreshTimer) {
            clearTimeout(sessionRefreshTimer);
          }
          
          if (refreshTime > 0) {
            sessionRefreshTimer = setTimeout(() => {
              supabase.auth.refreshSession();
            }, refreshTime);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      safeSetState(session);
    });

    return () => {
      mounted = false;
      if (sessionRefreshTimer) {
        clearTimeout(sessionRefreshTimer);
      }
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}