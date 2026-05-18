import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';

const GuestRoutes = () => {
  return !authService.isAuthenticated() ? <Outlet /> : <Navigate to="/folders" replace />;
};

export default GuestRoutes;
