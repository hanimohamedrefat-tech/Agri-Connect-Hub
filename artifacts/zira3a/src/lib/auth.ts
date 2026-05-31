import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "zira3a_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Setup the API client to use the token
setAuthTokenGetter(() => getToken());
