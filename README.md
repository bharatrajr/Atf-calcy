# ATF Duty Calculator (PWA)

## Files
- `index.html` — page structure
- `style.css` — all styling
- `app.js` — calculator logic, running-balance ledger, service worker registration
- `manifest.json` — PWA manifest (name, icons, colors)
- `sw.js` — service worker (offline caching)
- `icons/icon-192.png`, `icons/icon-512.png` — app icons

## Host on GitHub Pages
1. Create a new GitHub repo (e.g. `atf-duty-calculator`).
2. Upload all files in this folder, **keeping the folder structure** (the `icons/` folder must stay a subfolder).
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
5. GitHub gives you a URL like `https://<your-username>.github.io/atf-duty-calculator/`. It can take a minute to go live.
6. Open that URL on your phone → browser menu → **Add to Home Screen** (or **Install app**). It'll behave like a native app and works offline after the first load.

## Notes
- Rates and the running balance are stored in the browser's local storage — per device, not synced across devices.
- If you update any file later, bump `CACHE_NAME` in `sw.js` (e.g. `atf-duty-v2`) so returning visitors get the new version instead of a cached old one.
