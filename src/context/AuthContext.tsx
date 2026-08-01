import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, User as AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updatedFields: Partial<UserProfile>) => Promise<void>;
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

export function calculateCompletionScore(prof: Partial<UserProfile>): number {
  const fields = ['fullName', 'dob', 'address', 'phone', 'panNumber', 'passportNumber', 'aadhaarNumber'];
  let filledCount = 0;
  fields.forEach((f) => {
    const val = (prof as any)[f];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      filledCount++;
    }
  });
  return Math.round((filledCount / fields.length) * 100);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('master_profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const score = calculateCompletionScore({
          fullName: data.full_name,
          dob: data.dob,
          address: data.address,
          phone: data.phone,
          panNumber: data.pan_number,
          passportNumber: data.passport_number,
          aadhaarNumber: data.aadhaar_number,
        });

        setProfile({
          fullName: data.full_name || '',
          dob: data.dob || '',
          address: data.address || '',
          phone: data.phone || '',
          panNumber: data.pan_number || '',
          passportNumber: data.passport_number || '',
          aadhaarNumber: data.aadhaar_number || '',
          completionScore: score,
        });
      } else {
        setProfile(EMPTY_PROFILE);
      }
    } catch {
      setProfile(EMPTY_PROFILE);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(EMPTY_PROFILE);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(EMPTY_PROFILE);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('master_profile').upsert({
        id: data.user.id,
        full_name: name,
        completion_score: 15,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
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

  const appUser: AppUser | null = supabaseUser
    ? {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile.fullName || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        avatarUrl: supabaseUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        isVerified: true,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: appUser,
        supabaseUser,
        session,
        profile,
        loading,
        isAuthenticated: !!supabaseUser,
        signIn: signInWithEmail,
        signUp: signUpWithEmail,
        signInWithEmail,
        signUpWithEmail,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
