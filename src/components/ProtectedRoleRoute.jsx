import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/portal" state={{ from: location }} replace />;
  }
  
  // Get role from user metadata or determine from email
  const determineUserRole = (user) => {
    // Try to get role from user metadata
    if (user.user_metadata?.role) {
      return user.user_metadata.role;
    }
    
    // Otherwise try email pattern
    if (user.email) {
      const email = user.email.toLowerCase();
      
      if (email.includes('hod') || email.includes('head')) {
        return 'hod';
      } else if (email.includes('pm') || email.includes('program_manager')) {
        return 'program_manager';
      } else if (email.includes('teacher') || email.includes('faculty')) {
        return 'teacher';
      } else if (email.includes('student')) {
        return 'student';
      }
    }
    
    // Default role
    return 'student';
  };
  
  const userRole = determineUserRole(user);
  
  // Check if user's role is in the allowed roles list (case insensitive)
  const isRoleAllowed = allowedRoles.some(role => 
    role.toLowerCase() === userRole.toLowerCase()
  );
  
  if (!isRoleAllowed) {
    // If role not allowed, redirect to home page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
} 