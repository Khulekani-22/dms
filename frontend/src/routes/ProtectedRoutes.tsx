import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';

const ProtectedRoutes = () => {
  return authService.isAuthenticated() ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default ProtectedRoutes;
