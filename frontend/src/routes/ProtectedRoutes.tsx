import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';

const ProtectedRoutes = () => {
  const authenticated = authService.isAuthenticated();
  console.log('[ProtectedRoutes] isAuthenticated():', authenticated, '| dms_token in localStorage:', !!localStorage.getItem('dms_token'));
  return authenticated ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default ProtectedRoutes;
