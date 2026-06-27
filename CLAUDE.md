# DropSub Frontend Context

## Stack
- Static HTML/CSS/JS deployed on Vercel → dropsub.com
- No build step — plain HTML files
- Shared utilities: dropsub-auth.js, dropsub-notifications.js (injected on all authenticated pages)
- Icons: Lucide
- Charts: Chart.js
- Logo: https://dropsub-media.s3.amazonaws.com/brand/dropsub_logo_blue.png
- Favicon: https://dropsub-media.s3.amazonaws.com/brand/favicon-32.png
- Brand blue: #4B6BFB
- Background: #0a0f1e

## Key Pages
- Landing: dropsub-landing.html
- Fan dashboard: dropsub-fan-dashboard.html
- Artist dashboard: dropsub-artist-dashboard.html
- Discover: dropsub-discover.html
- Artist page: dropsub-artist.html
- Content viewer: dropsub-content-viewer.html
- Signup: dropsub-signup.html
- Login: dropsub-login.html
- Artist apply: dropsub-artist-apply.html

## Rules
- Never expose API keys, tokens, or credentials in output
- No new CSS frameworks — plain CSS only
- Match existing dark navy color scheme
- Use Lucide icons consistently
- All API calls go to https://api.dropsub.com
- Git push: git -C /Users/richardfrias/Desktop/dropsub-frontend push origin main
