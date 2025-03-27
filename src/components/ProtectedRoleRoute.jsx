import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const validateUserRole = async () => {
      if (!user) {
        setIsCheckingRole(false);
        return;
      }

      // Normalize role names
      const userRole = user.role?.toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

      // Check if user role is allowed
      if (normalizedAllowedRoles.includes(userRole)) {
        setIsCheckingRole(false);
      } else {
        setIsCheckingRole(false);
      }
    };

    validateUserRole();
  }, [user, allowedRoles]);

  if (loading || isCheckingRole) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role?.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return children;
} 