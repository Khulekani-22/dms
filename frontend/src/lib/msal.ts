import { PublicClientApplication, Configuration, PopupRequest } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID as string}`,
    // /redirect.html is a minimal static page in public/ that calls
    // handleRedirectPromise() and closes itself. Using it instead of the
    // app root prevents the React router from loading inside the popup and
    // navigating to /auth/login before MSAL can process the auth code.
    redirectUri: typeof window !== 'undefined'
      ? `${window.location.origin}/redirect.html`
      : 'http://localhost:5173/redirect.html',
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

// Wipe any stale interaction lock from a previous session/tab before
// creating the instance — prevents interaction_in_progress on fresh load
if (typeof window !== 'undefined') {
  Object.keys(sessionStorage)
    .filter((k) => k.includes('interaction.status'))
    .forEach((k) => sessionStorage.removeItem(k));
}

export const msalInstance = new PublicClientApplication(msalConfig);

// Export the initialization promise — callers must await this before any
// interactive API call (loginPopup, acquireTokenPopup, etc.)
export const msalReady: Promise<void> = msalInstance.initialize();

export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
