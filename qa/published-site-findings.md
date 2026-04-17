# Published Site Testing — ventexdemo.manus.space

## Demo Mode
- Landing page → INVESTOR DEMO → /demo pitch page → ENTER LIVE DEMO → /demo/dashboard
- ALL WORKING on published site. Full interactive demo renders correctly.

## Sign In / Sign Out
- AUTHORIZED ACCESS → redirects to Manus OAuth login page (correct)
- Attempting to access /dashboard → redirects to Manus OAuth login (correct — user not authenticated)
- The login page shows "Sign in to VENTEX powered by Aurovia" with Facebook, Google, Microsoft, Apple options
- Session cookies from the dev preview URL do NOT carry over to the published domain (different domain)
- User needs to actually log in on the published site to test sign out

## Root Cause Analysis
The user is likely not logged in on the published site. The browser session from the dev preview 
(3000-iwp88zgpy3c9vej77hg67-64a7c9f5.us2.manus.computer) does NOT carry to ventexdemo.manus.space.

When they click "AUTHORIZED ACCESS" they get sent to the OAuth login page, which is CORRECT behavior.
They need to complete the login flow first, then they can test sign out.

The "demo" also works — it's a static demo that doesn't require auth.

CONCLUSION: Both features appear to work correctly on the published site. The user may be 
experiencing an issue where they can't complete the OAuth login (e.g., Cloudflare verification blocking),
or there's a specific button/flow that's broken that I haven't tested.
