import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes/AppRoutes';
import { msalInstance, msalReady } from './lib/msal';
import { authService } from './services/authService';
import './index.css';

async function bootstrap() {
  await msalReady;

  try {
    const result = await msalInstance.handleRedirectPromise();
    if (result?.idToken) {
      // Microsoft redirect landed — exchange token before React mounts
      // so ProtectedRoutes sees isAuthenticated() = true on first render
      await authService.loginWithMicrosoft(result.idToken);
    }
  } catch (err) {
    console.error('[auth] Microsoft redirect error:', err);
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}

bootstrap();
