# Sign Out Investigation

## Issue
User reports sign out not working on published site (www.ventex.us.com)

## Code Review Findings

### Logout Flow
1. Frontend: `useAuth().logout()` calls `trpc.auth.logout.useMutation()`
2. Server: `auth.logout` procedure calls `res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 })`
3. Cookie options: `{ httpOnly: true, path: "/", sameSite: "none", secure: true }`

### Potential Issue: No redirect after logout
- In `Topbar.tsx`: After logout, it does `setTimeout(() => navigate("/"), 600)` — uses wouter navigate
- In `AppSidebar.tsx`: After logout, it just shows `toast.info("Signed out")` — NO redirect at all
- Problem: After clearing the cookie, the user stays on `/dashboard`. The `auth.me` query gets invalidated, which triggers the UNAUTHED redirect in main.tsx... but that redirects to the LOGIN page, not the landing page.

### Root Cause Hypothesis
The `redirectToLoginIfUnauthorized` in main.tsx catches the UNAUTHORIZED error from `auth.me` after logout and redirects to the Manus OAuth login page instead of the landing page. So the user gets bounced to the login screen immediately after signing out, making it look like sign out didn't work.

### Fix
After logout, explicitly redirect to "/" (landing page) BEFORE the auth query re-fires. Both Topbar and AppSidebar need to do `window.location.href = "/"` after logout to force a full page navigation to the landing page.
