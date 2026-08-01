import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, getSiteUrl } from '../lib/supabase';
import { User, UserProfile } from '../types';

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isLoading: boolean;
  profile: UserProfile;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const EMPTY_PROFILE: UserProfile = {
  fullName: '',
  dob: '',
  address: '',
  phone: '',
  panNumber: '',
  passportNumber: '',
  aadhaarNumber: '',
  completionScore: 0,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session and set up auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setProfile(EMPTY_PROFILE);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, userObj?: SupabaseUser) => {
    try {
      const { data, error } = await supabase.from('master_profile').select('*').eq('id', userId).single();

      if (data) {
        setProfile({
          fullName: data.full_name || userObj?.user_metadata?.name || '',
          dob: data.dob || '',
          address: data.address || '',
          phone: data.phone || '',
          panNumber: data.pan_number || '',
          passportNumber: data.passport_number || '',
          aadhaarNumber: data.aadhaar_number || '',
          completionScore: data.completion_score || 0,
        });
      } else {
        // Clean default profile creation without hardcoded demo data
        const defaultProfile: UserProfile = {
          fullName: userObj?.user_metadata?.name || '',
          dob: '',
          address: '',
          phone: '',
          panNumber: '',
          passportNumber: '',
          aadhaarNumber: '',
          completionScore: 0,
        };
        setProfile(defaultProfile);
      }
    } catch {
      setProfile(EMPTY_PROFILE);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${getSiteUrl()}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name },
      },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('master_profile').upsert({
        id: data.user.id,
        full_name: name,
        completion_score: 0,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${getSiteUrl()}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSupabaseUser(null);
    setSession(null);
    setProfile(EMPTY_PROFILE);
  };

  const updateProfile = async (updatedFields: Partial<UserProfile>) => {
    if (!supabaseUser) return;

    const merged = { ...profile, ...updatedFields };
    const score = calculateCompletionScore(merged);
    merged.completionScore = score;

    setProfile(merged);

    await supabase.from('master_profile').upsert({
      id: supabaseUser.id,
      full_name: merged.fullName,
      dob: merged.dob,
      address: merged.address,
      phone: merged.phone,
      pan_number: merged.panNumber,
      passport_number: merged.passportNumber,
      aadhaar_number: merged.aadhaarNumber,
      completion_score: score,
      updated_at: new Date().toISOString(),
    });
  };

  const userObj: User | null = supabaseUser
    ? {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile.fullName || supabaseUser.user_metadata?.name || 'User',
        avatarUrl:
          supabaseUser.user_metadata?.avatar_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        isVerified: true,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        session,
        user: userObj,
        isAuthenticated: !!supabaseUser,
        loading: isLoading,
        isLoading,
        profile,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function calculateCompletionScore(p: UserProfile): number {
  let filled = 0;
  if (p.fullName) filled++;
  if (p.dob) filled++;
  if (p.address) filled++;
  if (p.phone) filled++;
  if (p.panNumber) filled++;
  if (p.passportNumber) filled++;
  if (p.aadhaarNumber) filled++;
  return Math.round((filled / 7) * 100);
}
