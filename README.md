# Enlace (web)

A personal pedometer RPG that runs entirely in the phone's browser. You walk with an Eco partner through
La Red Profunda; the steps you take move you through its zones, trigger battles and events, and hatch eggs.
All creatures, zones and art are original and generated in code. All in-game text is in Spanish.

It's a 100 % static site: no accounts, no server, no database. Progress is saved in the browser's
`localStorage` on the phone. Terminal › Ajustes › Copia de seguridad downloads or restores a JSON backup.

This replaces the native iOS app in `../DigiVice` (kept as an archive). Rules, data and art are a faithful port.

## Steps

The browser can't read Health or count steps in the background, so steps arrive three ways, and none of
them ever counts twice:

- **Motion sensor:** counts while the game is open on screen (iOS asks for permission once).
- **Pegar de Salud / Escribir pasos:** run the optional Shortcut that copies today's Health total (recipe in
  Terminal › Ajustes; Back Tap makes it a double tap on the back of the phone) and tap *Pegar de Salud*,
  or type the number from the Health app. Only the growth since the last reading
  counts, minus what the sensor or simulator already credited that day.
- **Simular actividad:** adds 100–2,500 steps right away; a later Health sync the same day subtracts them.

The counter switch decides whether steps count. Giving the current Health total when switching marks
exactly where counting starts or stops.

## Develop

```sh
source ~/.nvm/nvm.sh && nvm use 22
npm install
npm run dev         # http://localhost:5173
npm test            # data, steps, motion detector, battles, sprites
npm run build       # → dist/ (relative paths, works under any subfolder)
npm run validate    # data coherence report
npm run simulate -- 120000 1 ajolin [--log] [--save=partida.json]
```

The project's `.npmrc` uses the public npm registry.

## Publish for free

### GitHub Pages (`.github/workflows/deploy.yml`)

1. Create a **public** repository on your personal GitHub account, e.g. `enlace`. (Pages on a private
   repository needs a paid plan.)
2. Push this folder:
   ```sh
   git add -A && git commit -m "Enlace web"
   git branch -M main
   git remote add origin https://github.com/<user>/enlace.git
   git push -u origin main
   ```
3. In the repository: **Settings › Pages › Build and deployment › Source: GitHub Actions**.
4. After 1–2 minutes the **Actions** tab shows the run finished, and the game is at
   `https://<user>.github.io/enlace/`.

### GitLab Pages (`.gitlab-ci.yml`)

1. Create a project on your personal gitlab.com account. It can be **private**: the site is still public.
2. Push the same way (`git remote add origin https://gitlab.com/<user>/enlace.git`, `git push -u origin main`).
3. When the pipeline finishes, the address is in **Deploy › Pages**, usually `https://<user>.gitlab.io/enlace/`.
   If that page shows "Use unique domain", either keep it or turn it off for the shorter address.

Every later `git push` publishes the new version.

## On the iPhone

1. Open the address in Safari.
2. Share › **Add to Home Screen** (keep "Open as Web App" on). It opens full screen, works offline.
3. In the game: choose your partner, turn on the counter, and sync your steps whenever you like.

Note: the home-screen app and Safari keep separate saves, so play from the icon.

## Privacy

- The page loads only its own files (Content-Security-Policy `'self'`), has no analytics or third-party code,
  and asks search engines not to index it.
- The save never leaves the phone. Anyone who opens the address gets their own empty game, never yours.
- The game only uses the accelerometer (while open) and whatever step number you type or paste.

## Layout

```
src/data       JSON content (source of truth), models, loader, validator
src/core       save + migration, seeded RNG, step import, motion step detector
src/systems    walk engine, actions, progression, challenges, training, fusion, battle (engine, AI, results)
src/art        palette, SpriteForge + body plans, sprites, zone backdrops
src/battle     canvas battle scene (normal-mapped lighting, glow, bloom, particles) and its UI
src/audio      WebAudio chiptune synth
src/ui         Preact screens: starter, partner, map, events, squad, terminal, training, settings
public         manifest, service worker, icons, robots.txt
tools          validate-data, simulate-walk, make-icon
```
