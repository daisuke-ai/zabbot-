/**
 * Database Connectivity Check Utility
 * This file provides functions to verify database connectivity and proper schema setup
 */

import { supabase } from '../services/supabaseService';

/**
 * Check if the database connection is working
 * @returns {Promise<Object>} Connection status
 */
export const checkDatabaseConnection = async () => {
  try {
    // Attempt to query a simple table
    const { data, error } = await supabase
      .from('departments')
      .select('count')
      .limit(1);
      
    if (error) {
      console.error('Database connection error:', error);
      return {
        connected: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      connected: true,
      data
    };
  } catch (err) {
    console.error('Exception during database connection check:', err);
    return {
      connected: false,
      error: err.message,
      details: err
    };
  }
};

/**
 * Check if the admin user exists
 * @returns {Promise<Object>} User status
 */
export const checkAdminUser = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'ammarv67@gmail.com')
      .eq('role', 'admin')
      .single();
      
    if (error) {
      console.error('Admin user check error:', error);
      return {
        exists: false,
        error: error.message
      };
    }
    
    return {
      exists: !!data,
      user: data
    };
  } catch (err) {
    console.error('Exception during admin user check:', err);
    return {
      exists: false,
      error: err.message
    };
  }
};

/**
 * Check the departments table 
 * @returns {Promise<Object>} Departments status
 */
export const checkDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*');
      
    if (error) {
      console.error('Departments check error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
    
    return {
      valid: true,
      count: data?.length || 0,
      departments: data
    };
  } catch (err) {
    console.error('Exception during departments check:', err);
    return {
      valid: false,
      error: err.message
    };
  }
};

/**
 * Run all database checks
 * @returns {Promise<Object>} Comprehensive status
 */
export const runDatabaseDiagnostics = async () => {
  const connection = await checkDatabaseConnection();
  
  // If can't connect, don't try other checks
  if (!connection.connected) {
    return {
      connected: false,
      adminUser: { checked: false },
      departments: { checked: false },
      error: connection.error
    };
  }
  
  const adminUser = await checkAdminUser();
  const departments = await checkDepartments();
  
  return {
    connected: true,
    adminUser: {
      checked: true,
      exists: adminUser.exists,
      ...(adminUser.error && { error: adminUser.error })
    },
    departments: {
      checked: true,
      valid: departments.valid,
      count: departments.count,
      ...(departments.error && { error: departments.error })
    }
  };
};

// Expose diagnostics function to window for console access
if (typeof window !== 'undefined') {
  window.checkDatabase = runDatabaseDiagnostics;
  console.log('Database diagnostics available via window.checkDatabase()');
}

export default {
  checkDatabaseConnection,
  checkAdminUser,
  checkDepartments,
  runDatabaseDiagnostics
}; 