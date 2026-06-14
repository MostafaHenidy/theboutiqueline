import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ADMIN_ROLES = ['admin', 'orders_admin'];

export default function AdminRoute({ children }) {
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !ADMIN_ROLES.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
