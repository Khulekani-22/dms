import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes/AppRoutes';
import { msalInstance, msalReady } from './lib/msal';
import './index.css';

// If this window was opened as an MSAL popup, handleRedirectPromise()
// will detect window.opener, process the auth code, post the result back
// to the main window, and call window.close() — all before React renders.
msalReady
  .then(() => msalInstance.handleRedirectPromise())
  .then((result) => {
    if (result) {
      // We are inside the popup window and MSAL handled the redirect.
      // The popup will be closed by MSAL automatically — do not render the app.
      console.log('[main] Popup redirect handled by MSAL, closing popup...');
      return;
    }
    // Normal main-window render
    mountApp();
  })
  .catch((err) => {
    console.error('[main] handleRedirectPromise error:', err);
    // Render the app anyway so the user isn't stuck on a blank page
    mountApp();
  });

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}
