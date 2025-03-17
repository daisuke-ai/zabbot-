import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { getUserByAny } from '../services/userService';

export default function ProtectedRoleRoute({ children, allowedRoles }) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [finalUserRole, setFinalUserRole] = useState(null);

  // Check if we're in a direct HOD login flow
  const isHodLoginFlow = localStorage.getItem('is_hod_login') === 'true';
  const isHodRoute = allowedRoles.some(role => 
    role.toLowerCase() === 'hod');

  useEffect(() => {
    const validateUserRole = async () => {
      if (!user) {
        setIsCheckingRole(false);
        return;
      }

      console.log("ProtectedRoleRoute: Validating role for user", user.email);

      try {
        // Get the user's database record using our safer function
        const dbUser = await getUserByAny({
          authUserId: user.id,
          email: user.email
        });
        
        let role = userRole;
        
        // Double-check with database record if available
        if (dbUser?.role && dbUser.role !== userRole) {
          console.log("ProtectedRoleRoute: Database role differs from context role:", dbUser.role, userRole);
          role = dbUser.role;
        }
        
        // Handle special HOD login flow if relevant
        if (isHodLoginFlow && isHodRoute) {
          console.log("ProtectedRoleRoute: In HOD login flow, allowing HOD access");
          role = 'hod';
          // Clear the flag after using it
          localStorage.removeItem('is_hod_login');
        }
        
        setFinalUserRole(role);
      } catch (error) {
        console.error("Error validating user role:", error);
        setFinalUserRole(userRole);
      } finally {
        setIsCheckingRole(false);
      }
    };

    if (!loading) {
      validateUserRole();
    }
  }, [user, userRole, loading, isHodLoginFlow, isHodRoute]);

  if (loading || isCheckingRole) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/portal" state={{ from: location }} replace />;
  }
  
  // Special case for HOD route - if this is a HOD portal and user email contains 'hod'
  if (isHodRoute && user?.email && (
    user.email.toLowerCase().includes('hod') || 
    user.email.toLowerCase().includes('head')
  )) {
    console.log("ProtectedRoleRoute: Special case - HOD email detected for HOD route");
    return children;
  }

  // Normalize roles for flexible comparison
  const normalizedUserRole = finalUserRole?.toLowerCase();
  
  // Check if user's role is in the allowed roles list (case insensitive)
  const isRoleAllowed = allowedRoles.some(role => 
    role.toLowerCase() === normalizedUserRole
  );
  
  console.log("ProtectedRoleRoute: Role check", {
    userRole: normalizedUserRole,
    allowedRoles: allowedRoles.map(r => r.toLowerCase()),
    isAllowed: isRoleAllowed
  });
  
  if (!isRoleAllowed) {
    // If role not allowed, redirect to portal page
    console.log("ProtectedRoleRoute: Access denied, redirecting to portal");
    return <Navigate to="/portal" state={{ from: location }} replace />;
  }

  return children;
} 