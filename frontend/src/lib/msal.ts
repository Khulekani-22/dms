import { PublicClientApplication, Configuration, RedirectRequest } from '@azure/msal-browser';

const redirectUri =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'http://localhost:5173/auth/callback';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID as string}`,
    redirectUri,
    postLogoutRedirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/login`,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Scopes: openid + profile give us the ID token with name/email
export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
