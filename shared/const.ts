export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// Session security — all users (including admins) must re-authenticate
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours absolute max
export const SESSION_IDLE_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes idle timeout (default, overridden by org config)
export const SESSION_ABSOLUTE_TIMEOUT_MS = 1000 * 60 * 60 * 8; // 8 hours absolute timeout (default, overridden by org config)
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
