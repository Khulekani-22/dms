import { PublicClientApplication, Configuration, PopupRequest } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID as string}`,
    redirectUri: typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173',
  },
  cache: {
    // localStorage is shared between the popup and the opener window (same origin).
    // sessionStorage is NOT shared — the popup gets a fresh empty sessionStorage,
    // so handleRedirectPromise() in the popup sees no interaction state and returns
    // null without posting the token back → main window times out.
    cacheLocation: 'localStorage',
  },
};

// Wipe any stale interaction lock before creating the instance
if (typeof window !== 'undefined') {
  Object.keys(localStorage)
    .filter((k) => k.includes('interaction.status'))
    .forEach((k) => localStorage.removeItem(k));
}

export const msalInstance = new PublicClientApplication(msalConfig);

export const msalReady: Promise<void> = msalInstance.initialize();

export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
