/**
 * Utility script to help troubleshoot admin access issues
 */

// Function to force admin access for the current session
export const forceAdminAccess = () => {
  console.log('Forcing admin access...');
  localStorage.setItem('is_admin', 'true');
  console.log('Admin flag set in localStorage');
  
  // Force a page reload to apply the changes
  window.location.reload();
};

// Function to check current admin status
export const checkAdminStatus = () => {
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  const userData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  const email = userData?.user?.email;
  
  console.log('Admin flag in localStorage:', isAdmin);
  console.log('User email in localStorage:', email);
  console.log('Is admin email match:', email === 'ammarv67@gmail.com');
  
  return {
    isAdmin,
    email,
    isAdminEmail: email === 'ammarv67@gmail.com',
    userData
  };
};

// Function to clear admin access
export const clearAdminAccess = () => {
  console.log('Clearing admin access...');
  localStorage.removeItem('is_admin');
  console.log('Admin flag removed from localStorage');
  
  // Force a page reload to apply the changes
  window.location.reload();
};

// Add these functions to the window object for easy access in browser console
if (typeof window !== 'undefined') {
  window.forceAdminAccess = forceAdminAccess;
  window.checkAdminStatus = checkAdminStatus;
  window.clearAdminAccess = clearAdminAccess;
  
  console.log('Admin utility functions added to window object. You can use:');
  console.log('- window.forceAdminAccess() - to force admin access');
  console.log('- window.checkAdminStatus() - to check current admin status');
  console.log('- window.clearAdminAccess() - to clear admin access');
}

export default {
  forceAdminAccess,
  checkAdminStatus,
  clearAdminAccess
}; 