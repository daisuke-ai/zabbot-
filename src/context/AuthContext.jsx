import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const determineUserRole = async (user) => {
    try {
      if (!user) return 'student';

      // Get user role from database
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Normalize role names
      const role = dbUser?.role?.toLowerCase() || 'student';
      
      // Handle 'program_manager' and 'pm' as the same role
      if (role === 'program_manager' || role === 'pm') {
        return 'pm';
      }

      return role;
    } catch (error) {
      console.error('Error determining user role:', error);
      return 'student';
    }
  };

  // Helper function to update user and role
  const updateUserAndRole = async (newUser) => {
    setUser(newUser);
    
    if (newUser) {
      try {
        // Use the safer role determination function
        const role = await determineUserRole(newUser);
        setUserRole(role);
        console.log('User role determined:', role);
      } catch (err) {
        console.error('Error determining user role:', err);
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          // Get user profile from database
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
            
          if (profileError) throw profileError;
          
          setUser({
            ...session.user,
            ...userProfile
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Get user profile from database
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (error) throw error;
        
        setUser({
          ...session.user,
          ...userProfile
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auth context value
  const value = {
    user,
    userRole,
    loading,
    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user;
    },
    logout: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
    signup: async (email, password, metadata) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: { data: metadata }
        });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Signup error:', error);
        throw error;
      }
    }
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext); 