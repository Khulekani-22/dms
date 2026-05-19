import { PublicClientApplication, Configuration, PopupRequest } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID as string}`,
    // For popup flow the redirect URI must be registered in Azure but is only
    // used to close the popup — it can be the app root or a blank page.
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Store the initialization promise so callers can await it before
// triggering any interaction (avoids interaction_in_progress errors).
export const msalReady: Promise<void> = msalInstance.initialize();

export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
