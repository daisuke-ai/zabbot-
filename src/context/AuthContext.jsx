import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("AuthContext: Initializing auth...");
      setLoading(true);
      try {
        // Get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error("AuthContext: Error getting initial session:", sessionError);
            throw sessionError;
        }
        setSession(currentSession);
        console.log("AuthContext: Initial session:", currentSession);
        
        let currentUser = null;
        if (currentSession?.user) {
          // Get user profile from database if session exists
           console.log(`AuthContext: Fetching profile for user ID: ${currentSession.user.id}`);
           const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*') // Fetch all necessary fields
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
            
          if (profileError) {
              console.error("AuthContext: Error fetching initial profile:", profileError);
          } else if (userProfile) {
              console.log("AuthContext: Initial profile found:", userProfile);
              currentUser = {
                ...currentSession.user, // Core auth data (like email, auth id)
                ...userProfile  // Your public.users table data (like custom id, role, department_name, active)
              };
          } else {
             console.warn("AuthContext: User session exists but no profile found in 'users' table.");
             currentUser = currentSession.user; // Fallback to auth user data only
          }
        } else {
            console.log("AuthContext: No active session found initially.");
        }
        setUser(currentUser);
        console.log("AuthContext: Initial user state set:", currentUser);

      } catch (error) {
        console.error('AuthContext: Initialization error:', error);
        setUser(null); // Ensure user is null on error
      } finally {
        setLoading(false);
         console.log("AuthContext: Initialization finished.");
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`AuthContext: onAuthStateChange event: ${event}`, currentSession);
      setSession(currentSession);
      let currentUser = null;
      if (event === 'SIGNED_IN' && currentSession?.user) {
        console.log(`AuthContext: SIGNED_IN - Fetching profile for user ID: ${currentSession.user.id}`);
         const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();
          
        if (profileError) {
             console.error("AuthContext: Error fetching profile on SIGNED_IN:", profileError);
             currentUser = currentSession.user;
        } else if (userProfile) {
             console.log("AuthContext: Profile found on SIGNED_IN:", userProfile);
             currentUser = { ...currentSession.user, ...userProfile };
        } else {
             console.warn("AuthContext: SIGNED_IN but no profile found in 'users' table.");
             currentUser = currentSession.user;
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("AuthContext: SIGNED_OUT");
        currentUser = null;
      } else if (currentSession?.user) {
           const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
           if (userProfile && !profileError) {
               currentUser = { ...currentSession.user, ...userProfile };
           } else {
               currentUser = currentSession.user; 
           }
      } else {
          currentUser = null;
      }
      setUser(currentUser);
      console.log("AuthContext: User state updated by listener:", currentUser);
    });

    // Cleanup function
    return () => {
      console.log("AuthContext: Unsubscribing auth listener.");
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Auth context value
  const value = {
    user, 
    session,
    loading,
    login: async (email, password) => {
      console.log("AuthContext: login function called.");
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
          console.error("AuthContext: signInWithPassword error:", authError);
          throw authError; // Let the UI handle this error
      }
      if (!authData?.user) {
          console.error("AuthContext: signInWithPassword success but no user data.");
          throw new Error("Authentication failed, please try again.");
      }
       console.log(`AuthContext: Auth successful for user ID: ${authData.user.id}`);

      // 2. Fetch the user's profile from the 'users' table
      console.log(`AuthContext: Fetching profile for logged-in user: ${authData.user.id}`);
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*') 
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (profileError) {
          console.error("AuthContext: Error fetching user profile after login:", profileError);
          // Decide if login should fail completely or proceed without profile
          // For now, let's fail it as profile is crucial
          await supabase.auth.signOut(); // Sign out if profile fetch fails
          throw new Error("Could not retrieve user profile after login.");
      }
      if (!userProfile) {
          console.warn(`AuthContext: User profile not found in 'users' table for ID: ${authData.user.id}. Signing out.`);
          await supabase.auth.signOut(); // Sign out if profile doesn't exist
          throw new Error("User profile not found. Please complete signup or contact support.");
      }
      console.log("AuthContext: User profile fetched:", userProfile);

      // --- STUDENT ACTIVE CHECK ---
      // 3. Check active status ONLY if the user's role is 'student'
      if (userProfile.role === 'student') {
        console.log("AuthContext: User is student. Checking active status:", userProfile.active);
        if (userProfile.active === false) {
          console.warn(`AuthContext: Inactive student login blocked for ${email}. Signing out.`);
          await supabase.auth.signOut(); // Sign out the inactive student
          // Throw the specific error to be caught by the Login page
          throw new Error('Your account is pending approval. Please wait or contact support.');
        }
         console.log("AuthContext: Active student login allowed.");
      } else {
         console.log(`AuthContext: User role is ${userProfile.role}. Skipping active check.`);
      }
      // --- END CHECK ---

      // 4. If checks pass, update the user state (onAuthStateChange might also do this, but setting explicitly ensures immediate availability)
      const fullUser = { ...authData.user, ...userProfile };
      setUser(fullUser);
      setSession(authData.session);
      console.log("AuthContext: User state set after successful login:", fullUser);

      // Return the combined user object (auth + profile)
      return fullUser;
    },
    logout: async () => {
      console.log("AuthContext: logout function called.");
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("AuthContext: Error signing out:", error);
      }
      // onAuthStateChange listener should handle setting user and session to null
      // setUser(null); // Explicitly setting might cause race condition with listener
      // setSession(null);
       console.log("AuthContext: Sign out process initiated.");
    },
    signup: async (email, password, metadata) => {
       console.log("AuthContext: signup function called.");
      try {
        // Ensure metadata includes role and active: false for students
        const options = { data: metadata };
        if (metadata.role === 'student' && metadata.active === undefined) {
            options.data.active = false; // Explicitly set student signups to inactive if not provided
        }
         console.log("AuthContext: Attempting Supabase signup with options:", options);

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: options 
        });
        
        if (error) {
             console.error("AuthContext: Supabase signup error:", error);
             throw error;
        }
         console.log("AuthContext: Supabase signup successful:", data);
         setSession(data.session);

        // Important: Need to insert into 'users' table immediately after signup
        if (data.user) {
             console.log(`AuthContext: Inserting user profile into 'users' table for ID: ${data.user.id}`);
             const profileData = {
                 user_id: data.user.id,
                 email: data.user.email,
                 first_name: metadata.first_name || '',
                 last_name: metadata.last_name || '',
                 role: metadata.role || 'student', // Default role if not provided
                 department_name: metadata.department_name || null,
                 active: metadata.role === 'student' ? false : (metadata.active !== undefined ? metadata.active : true) // Students inactive, others active by default unless specified
             };
             console.log("AuthContext: Profile data to insert:", profileData);

             const { error: insertError } = await supabase
                .from('users')
                .insert(profileData);

             if (insertError) {
                 console.error("AuthContext: Error inserting user profile after signup:", insertError);
                 // Consider deleting the auth user if profile insert fails to avoid orphans
                 // await supabase.auth.admin.deleteUser(data.user.id); // Requires admin privileges
                 throw new Error("Signup succeeded but failed to create user profile.");
             }
              console.log("AuthContext: User profile inserted successfully.");
        }

        return data; // Return signup data (might include user, session)
      } catch (error) {
        console.error('AuthContext: Signup processing error:', error);
        throw error; // Rethrow for UI handling
      }
    }
  };

  // Provide the context value to children components
  // Ensure children are only rendered when loading is false to prevent issues with initial null user state
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext); 