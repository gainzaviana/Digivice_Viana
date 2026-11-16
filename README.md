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

- **Stats:** HP, AP (attack), SP (speed: mirror tiebreak and dodge), and a DP pool of 0–20 (+1 per 150 steps,
  +1 every 2 h resting; spent on evolutions and Parches). Level 1: 20 HP / 4 AP / 3 SP, then +4 / +1.5 / +1 per level up
  to level 30; archetypes only vary HP by about ±1 (mirror clashes go to the higher AP, so AP/SP stay equal per level).
- **Individual progression:** XP, level, bond, bonuses and unlocked evolutions belong to the Eco that earned them.
  About 3 wins per level early, up to 15 late. Partners start at level 1 in their Stage 1 form.
- **Evolution:** an Eco never changes form permanently. Beating a boss unlocks its next stage for that Eco only.
  Before a battle it can spend DP to fight evolved: Stage 2 ×1.6 for 5 DP, Stage 3 ×2.3 for 10, Stage 4/Fusión ×3.2 for 15.
- **Combat (D-Ark triangle):** each turn both sides pick at once — Quick Shot (`max(1, AP − enemy AP × 0.3)`),
  Physical Strike (`max(1, AP × 1.5 − enemy AP × 0.3)`) or Charged Attack (`max(2, AP × 2.2 − enemy AP × 0.3)`,
  1 Carga). Quick beats Charged, Physical beats Quick, Charged beats Physical; the same move goes to the higher AP
  (SP breaks ties, a perfect tie cancels both). Only one side ever hits per turn, and that hit can still be dodged:
  `clamp((defender SP − attacker SP) × 4, 5, 35) %`. A mild affinity factor (×1.15 / ×0.9) applies on top.
  Low bond (< 30) means a 10–15 % chance of disobeying. The stage plays it slowly — wind-up, travel, the clash, then
  the impact — and HP only drops when the hit lands.
- **Difficulty:** `tools/tune-zones.ts` sets every zone's levels by simulating battles: wild Ecos winnable without
  evolving, bosses that need levels and the evolutions available by then (a level 1 partner can't beat the first one).
  `tools/archetype-matrix.ts` checks the archetypes against each other.

## Map, events and recovery

- **18 cities in 6 Areas** (plus a secret one). Every city has its own boss; the 3rd city's boss is the Area Boss,
  which frees a new partner line (it joins at level 1). Roads per city: Area 1 1,500 steps, Area 2 3,500, Area 3 6,000,
  Area 4 9,000, Area 5 12,500, Area 6 16,000 / 19,000 / 22,000 — about 154,000 steps, ~7 weeks at 3,000 a day.
  Landmarks every 1,000 steps. Cities have a healing spot, a shrine and a shop.
- **Digivice alerts** every 150–350 steps: wild battle 60 %, data cache 20 % (DP, items, Parches, eggs), SOS rescue
  10 % (a tougher captor; winning gives bond and often rare data), data hazard 10 % (tap/shake challenge: XP or a small
  HP/DP loss). They show on the home path and in Sucesos.
- **Digi-eggs** (500 / 1,200 / 2,000 steps) from caches, city bosses and rescues, in a 3-slot incubator.
- **Defeat:** pushed back 300–600 steps on the road, injured at 1 HP (no battles until healed), bond −3. Lifetime steps
  and egg progress are never lost. Injuries heal with the Pulse game, healing items, the city, 2 h of rest or 300 steps.
- **Cuidados:** Energy Charge (DP +3…+6, bond) and Data Pulse (30–75 % HP, cures injuries). 3 charges, +1 every
  500 steps or 2 hours.

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

## App de la pantalla de inicio (iOS)

- Se abre a pantalla completa (`display: standalone`). iOS le da **su propia partida**, separada de la de Safari: para pasarla, Terminal › Ajustes › «Descargar copia» en una y «Restaurar copia» en la otra.
- **Cargar pasos de Salud**: en la app ejecuta el atajo sin enlace de vuelta (iOS lo abriría en Safari). El atajo copia los pasos; al volver aparece «¿Ya terminó el atajo? · Pegar».
- Atajo: «Buscar muestras de salud» (Pasos, hoy, por día) → «Copiar al portapapeles» → «Detener y generar salida» (Muestras de salud). Sirve para Safari y para la app.
- Enlace directo: `…/Digivice_Viana/?syncSteps=8421[&date=AAAA-MM-DD]` = total de Salud de ese día (se suma solo lo nuevo). iOS abre los enlaces en Safari.
- **+500 / +1.000 / Otra cantidad** (hasta 5.000) y **Modo paseo**: pantalla negra con contador grande; mantiene la pantalla encendida (Wake Lock) para que el sensor siga contando. Se sale con doble toque.
