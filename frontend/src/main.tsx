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
    console.log('[main] handleRedirectPromise result:', result);

    if (result?.idToken) {
      // Microsoft redirect just landed — exchange token BEFORE React mounts
      // so ProtectedRoutes sees isAuthenticated() = true immediately
      console.log('[main] Got idToken from redirect, posting to backend...');
      const res = await authService.loginWithMicrosoft(result.idToken);
      console.log('[main] Backend responded — user stored:', res.user);
      // Token + user are now in localStorage; app will mount authenticated
    }
  } catch (err) {
    console.error('[main] handleRedirectPromise error:', err);
    // Clear any partial state and let the app mount unauthenticated
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
