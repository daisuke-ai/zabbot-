/**
 * Helper script to force admin access
 * 
 * This can be used to manually set admin access when testing:
 * 1. Import this file: import './utils/forceAdmin'
 * 2. Or run it directly from browser console:
 *    fetch('/utils/forceAdmin.js').then(r => r.text()).then(eval)
 */

(function setupAdminAccess() {
  console.log('Setting up admin access...');
  
  // Create admin session object
  const adminSessionData = {
    access_token: 'admin_session_token',
    user: {
      id: 'admin_user_id',
      email: 'ammarv67@gmail.com',
      role: 'admin'
    }
  };
  
  // Set admin flags in localStorage
  localStorage.setItem('is_admin', 'true');
  localStorage.setItem('admin_email', 'ammarv67@gmail.com');
  localStorage.setItem('admin_session', JSON.stringify(adminSessionData));
  
  console.log('Admin access set up successfully.');
  console.log('You can now access admin features.');
  
  // Add global functions for console access
  window.forceAdminAccess = function() {
    localStorage.setItem('is_admin', 'true');
    localStorage.setItem('admin_email', 'ammarv67@gmail.com');
    localStorage.setItem('admin_session', JSON.stringify(adminSessionData));
    console.log('Admin access enabled. Refreshing page...');
    setTimeout(() => window.location.reload(), 500);
  };
  
  window.clearAdminAccess = function() {
    localStorage.removeItem('is_admin');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_session');
    console.log('Admin access cleared. Refreshing page...');
    setTimeout(() => window.location.reload(), 500);
  };
})();

// Make functions available outside the IIFE
export const setupAdminAccess = () => {
  const adminSessionData = {
    access_token: 'admin_session_token',
    user: {
      id: 'admin_user_id',
      email: 'ammarv67@gmail.com',
      role: 'admin'
    }
  };
  
  localStorage.setItem('is_admin', 'true');
  localStorage.setItem('admin_email', 'ammarv67@gmail.com');
  localStorage.setItem('admin_session', JSON.stringify(adminSessionData));
  return true;
};

export const clearAdminAccess = () => {
  localStorage.removeItem('is_admin');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_session');
  return true;
}; 