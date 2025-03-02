import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProtectedRoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!allowedRoles.includes(user?.role)) return <Navigate to="/login" />;

  return children;
} 