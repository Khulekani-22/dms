import { PublicClientApplication, Configuration, RedirectRequest } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID as string}`,
    // Use the app root — works with whatever Azure has registered
    redirectUri: typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
export const msalReady: Promise<void> = msalInstance.initialize();

export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
