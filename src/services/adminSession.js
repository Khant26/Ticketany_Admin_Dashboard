const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_DATA_KEY = "user_data";
const ADMIN_FLAG_KEY = "is_admin";

export const ADMIN_AUTH_CHANGED_EVENT = "adminAuthChanged";

export function getAdminAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredAdminUser() {
  const raw = localStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasAdminPrivileges(user = getStoredAdminUser()) {
  if (!user) {
    return localStorage.getItem(ADMIN_FLAG_KEY) === "true";
  }

  return (
    user.is_superuser === true ||
    user.is_staff === true ||
    localStorage.getItem(ADMIN_FLAG_KEY) === "true"
  );
}

export function clearAdminSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(ADMIN_FLAG_KEY);
}

export function notifyAdminAuthChanged(detail = {}) {
  window.dispatchEvent(
    new CustomEvent(ADMIN_AUTH_CHANGED_EVENT, {
      detail,
    })
  );
}

export function decodeTokenPayload(token) {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      return null;
    }

    const [, payloadPart] = token.split(".");
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  return payload.exp <= Math.floor(Date.now() / 1000);
}

export function getTokenExpiryDelay(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return 0;
  }

  return Math.max(payload.exp * 1000 - Date.now(), 0);
}

export async function verifyAdminSessionWithServer(token = getAdminAccessToken()) {
  if (!token) return false;

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/";
  const endpoints = ["user/profile/", "auth/me/"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return true;
      }

      if (response.status === 401 || response.status === 403) {
        return false;
      }

      if (response.status !== 404) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}