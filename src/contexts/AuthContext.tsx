import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Enable debug logging for troubleshooting
const DEBUG_AUTH = true;

function logAuthEvent(event: string, details?: unknown) {
  if (DEBUG_AUTH) {
    const timestamp = new Date().toISOString();
    console.log(`[Auth ${timestamp}] ${event}`, details || '');
  }
}

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
  
  logAuthEvent('AUTH_PROVIDER_INIT', { timestamp: Date.now() });

  useEffect(() => {
    let mounted = true;
    let sessionRefreshTimer: NodeJS.Timeout | null = null;

    // Function to safely update state only if component is mounted
    const safeSetState = (newSession: Session | null) => {
      if (!mounted) {
        logAuthEvent('STATE_UPDATE_SKIPPED', { reason: 'component_unmounted' });
        return;
      }
      
      const sessionChanged = newSession?.access_token !== session?.access_token;
      logAuthEvent('SAFE_SET_STATE', {
        sessionChanged,
        hasNewSession: !!newSession,
        newUserId: newSession?.user?.id,
        oldUserId: session?.user?.id,
        accessTokenChanged: sessionChanged
      });
      
      // Only update if session actually changed
      if (sessionChanged) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
      setLoading(false);
    };

    // Set up auth state listener with better handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        logAuthEvent('AUTH_STATE_CHANGE', {
          event,
          hasNewSession: !!newSession,
          newUserId: newSession?.user?.id,
          currentUserId: session?.user?.id,
          expiresAt: newSession?.expires_at,
          accessTokenPreview: newSession?.access_token?.substring(0, 20) + '...'
        });
        
        // Ignore token refresh events to prevent unnecessary re-renders
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === newSession?.user?.id) {
          logAuthEvent('TOKEN_REFRESH_IGNORED', { 
            reason: 'same_user',
            userId: session?.user?.id 
          });
          return;
        }
        
        safeSetState(newSession);
        
        // Set up proactive session refresh before expiry
        if (newSession?.expires_at) {
          const expiresAt = new Date(newSession.expires_at * 1000);
          const refreshTime = expiresAt.getTime() - Date.now() - (5 * 60 * 1000); // Refresh 5 minutes before expiry
          
          logAuthEvent('SESSION_REFRESH_SCHEDULED', {
            expiresAt: expiresAt.toISOString(),
            refreshIn: refreshTime / 1000 / 60, // minutes
            currentTime: new Date().toISOString()
          });
          
          if (sessionRefreshTimer) {
            clearTimeout(sessionRefreshTimer);
          }
          
          if (refreshTime > 0) {
            sessionRefreshTimer = setTimeout(() => {
              logAuthEvent('PROACTIVE_SESSION_REFRESH', { timestamp: Date.now() });
              supabase.auth.refreshSession();
            }, refreshTime);
          }
        }
      }
    );

    // Check for existing session
    logAuthEvent('CHECKING_EXISTING_SESSION');
    supabase.auth.getSession().then(({ data: { session } }) => {
      logAuthEvent('EXISTING_SESSION_RESULT', {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });
      safeSetState(session);
    });

    return () => {
      logAuthEvent('AUTH_PROVIDER_CLEANUP');
      mounted = false;
      if (sessionRefreshTimer) {
        clearTimeout(sessionRefreshTimer);
      }
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    try {
      logAuthEvent('SIGN_IN_ATTEMPT', { email });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      logAuthEvent('SIGN_IN_RESULT', { success: !error, error: error?.message });
      return { error };
    } catch (error) {
      logAuthEvent('SIGN_IN_ERROR', { error });
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