import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { firstAdminTab } from '../utils/adminAccess';

export function AdminIndexRedirect() {
  const { hasPermission } = useAuth();
  return <Navigate to={firstAdminTab(hasPermission)} replace />;
}
