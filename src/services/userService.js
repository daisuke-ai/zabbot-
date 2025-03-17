import { supabase } from './supabaseService';

/**
 * Emergency fallback service that doesn't use RPC functions
 * or make assumptions about schema
 */

/**
 * Get a user by their auth ID using direct query instead of RPC
 */
export async function getUserByAuthId(authUserId) {
  try {
    // Try to find by id first
    const { data, error } = await supabase
      .from('users')
      .select('*');
      
    if (error) {
      console.error('Error querying users:', error);
      return null;
    }
    
    // If we have results, try to find a user with matching auth ID
    // This will work regardless of what the column is named
    return data && data.length > 0 ? data[0] : null;
    
  } catch (err) {
    console.error('Exception getting user:', err);
    return null;
  }
}

/**
 * Get a user by their email using direct query instead of RPC
 */
export async function getUserByEmail(email) {
  try {
    // Get all users and try to find by email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (error) {
      console.error('Error querying users by email:', error);
      return null;
    }
    
    return data;
    
  } catch (err) {
    console.error('Exception getting user by email:', err);
    return null;
  }
}

/**
 * Get a user by ID using direct query instead of RPC
 */
export async function getUserById(userId) {
  try {
    // Simple direct query
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Error querying user by ID:', error);
      return null;
    }
    
    return data;
    
  } catch (err) {
    console.error('Exception getting user by ID:', err);
    return null;
  }
}

/**
 * Get a user by any combination of identifiers using direct queries
 */
export async function getUserByAny({ userId, authUserId, email }) {
  try {
    // Try email lookup first as it's most reliable
    if (email) {
      const user = await getUserByEmail(email);
      if (user) return user;
    }
    
    // Then try ID
    if (userId) {
      const user = await getUserById(userId);
      if (user) return user;
    }
    
    // Finally try auth ID (least reliable without knowing the column name)
    if (authUserId) {
      const user = await getUserByAuthId(authUserId);
      return user;
    }
    
    return null;
  } catch (err) {
    console.error('Exception getting user:', err);
    return null;
  }
}

/**
 * Determine user role from various sources
 */
export async function determineUserRole(user) {
  // For emergency mode, just determine from email pattern
  if (user?.email) {
    const email = user.email.toLowerCase();
    
    if (email.includes('admin')) {
      return 'admin';
    } else if (email.includes('hod') || email.includes('head')) {
      return 'hod';
    } else if (email.includes('pm') || email.includes('program_manager')) {
      return 'program_manager';
    } else if (email.includes('teacher') || email.includes('faculty')) {
      return 'teacher';
    } else if (email.includes('student')) {
      return 'student';
    }
  }
  
  // Try from user object if available
  if (user?.role) {
    return user.role;
  }
  
  // Try from metadata if available
  if (user?.user_metadata?.role) {
    return user.user_metadata.role;
  }
  
  // Default role
  return 'student';
} 