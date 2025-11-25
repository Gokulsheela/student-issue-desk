import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminRole = async (userId: string) => {
      setCheckingRole(true);
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();
      
      setCheckingRole(false);
      return !!data;
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const adminStatus = await checkAdminRole(session.user.id);
          setIsAdmin(adminStatus);
          setLoading(false);
        } else {
          setIsAdmin(false);
          setCheckingRole(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const adminStatus = await checkAdminRole(session.user.id);
        setIsAdmin(adminStatus);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name }
      }
    });

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive'
      });
      return { error };
    }

    toast({
      title: 'Account created',
      description: 'Welcome to the platform!'
    });

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive'
      });
      return { error };
    }

    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    // Clear local state regardless of API response
    // If session is already expired, that's fine - we still want to sign out locally
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    
    // Only show error for actual problems (not expired sessions)
    if (error && error.message !== 'Session from session_id claim in JWT does not exist') {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return {
    user,
    session,
    loading: loading || checkingRole,
    isAdmin,
    signUp,
    signIn,
    signOut
  };
};
