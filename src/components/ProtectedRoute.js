import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
} 