import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseService';
import { determineUserRole } from '../services/userService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          await updateUserAndRole(null);
        } else if (data.session) {
          await updateUserAndRole(data.session.user);
        } else {
          await updateUserAndRole(null);
        }
      } catch (err) {
        console.error('Session check error:', err);
        await updateUserAndRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    
    // Set up auth state change listener
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        await updateUserAndRole(session.user);
      } else {
        await updateUserAndRole(null);
      }
      setLoading(false);
    });

    // Clean up subscription
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Auth context value
  const value = {
    user,
    userRole,
    loading,
    login: async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
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