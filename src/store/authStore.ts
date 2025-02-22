import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role: 'farmer' | 'buyer';
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,

      setUser: (user) => {
        console.log('Setting user state:', user ? 'User present' : 'No user');
        set({ user, isAuthenticated: !!user });
      },

      clearAuth: () => {
        console.log('Clearing auth state');
        set({ user: null, isAuthenticated: false });
      },

      initialize: async () => {
        try {
          console.log('Starting auth initialization...');
          
          // Get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            set({ user: null, isAuthenticated: false, isInitialized: true });
            return;
          }

          if (!session?.user) {
            console.log('No active session found');
            set({ user: null, isAuthenticated: false, isInitialized: true });
            return;
          }

          // Fetch the user profile
          console.log('Session found, fetching profile...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile) {
            console.error('Profile error or not found:', profileError);
            set({ user: null, isAuthenticated: false, isInitialized: true });
            // Sign out if we have a session but no profile
            await supabase.auth.signOut();
            return;
          }

          console.log('Profile found, setting authenticated state');
          set({ 
            user: profile as User, 
            isAuthenticated: true, 
            isInitialized: true 
          });
          
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ user: null, isAuthenticated: false, isInitialized: true });
          
          // Try to sign out in case of error
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Error during sign out:', e);
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        // Validate the rehydrated state
        if (state?.user) {
          console.log('Rehydrated user state:', state.user);
          state.isInitialized = false; // Force re-initialization on reload
        }
      }
    }
  )
);
