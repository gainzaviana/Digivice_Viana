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

## Rules (D-Ark style)

- **Stats:** HP, AP (attack), SP (speed: who fires first and dodge chance), and a DP pool of 0–50 (+1 per 150 steps,
  +1 every 2 h resting; spent on evolutions and Parches). Each line has an archetype profile (`reglas.json › archetypes`)
  and grows every level.
- **Individual progression:** XP, level, bond, bonuses and unlocked evolutions belong to the Eco that earned them.
  About 3 wins per level early, up to 15 late. Partners start at level 1 in their Stage 1 form.
- **Evolution:** an Eco never changes form permanently. Beating a boss unlocks its next stage for that Eco only
  (Stage 2 from any boss, Stage 3 from zone 5, Stage 4 from zone 10; branches need their bond/wins/losses conditions;
  Fusions from zone 13 and Despertar from zone 16). Before a battle it can spend DP to fight evolved:
  Stage 2 ×1.6 for 5 DP, Stage 3 ×2.3 for 10, Stage 4/Fusión ×3.2 for 15, Despertar ×3.6 for 20.
- **Combat:** each turn, Basic shot, Strong attack (1 Carga; Carga refills +1 a turn, max 3) or a Parche (costs DP,
  takes the turn). Basic pierces a charging Strong. Strong vs Strong: higher AP wins (SP breaks ties). Basic vs Basic:
  both fire, faster first. Damage: Basic `max(1, AP − enemy AP × 0.3)`, Strong `max(2, AP × 2.2 − enemy AP × 0.3)`,
  then a mild affinity factor (×1.15 / ×0.9). Dodge: `clamp((defender SP − attacker SP) × 4, 5, 35) %`.
  Bond under 30 means a 10–15 % chance of disobeying (doing nothing or a random move).
- **Difficulty:** `tools/tune-zones.ts` sets every zone's levels by simulating battles: wild Ecos winnable without
  evolving, bosses that need levels and the evolutions available by then (a level 1 partner can't beat the first one).
  `tools/archetype-matrix.ts` checks the archetypes against each other.

## Develop

```sh
source ~/.nvm/nvm.sh && nvm use 22
npm install
npm run dev         # http://localhost:5173
npm test            # data, steps, motion detector, battles, sprites
npm run build       # → dist/ (relative paths, works under any subfolder)
npm run validate    # data coherence report
npm run simulate -- 120000 1 ajolin [--log] [--save=partida.json]
npx tsx tools/tune-zones.ts [--write]      # re-derive zone/boss levels from simulated battles
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
