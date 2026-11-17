# Tus sprites de Ecos

Deja aquí tus PNG (o WebP) y vuelve a construir el juego (`npm run build`, o haz push: GitHub Pages lo construye).

- `<id>.png` → aspecto normal (también vale `<id>_idle.png`)
- `<id>_brillante.png` → aspecto Brillante (también `<id>_shiny.png`). Si no está, se recolorea el normal.
- `<id>_infectado.png` → opcional

`<id>` es el `id` de la especie en `src/data/json/ecos.json` (lista completa en el README).

Formato: PNG con fondo transparente, cuadrado, 512×512 (256×256 también sirve), el Eco mirando
a la DERECHA, centrado y con los pies tocando el borde inferior. Sin hojas de sprites: una imagen
por aspecto (el juego anima respiración, saltos y golpes por su cuenta).
