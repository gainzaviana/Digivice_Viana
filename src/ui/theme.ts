/**
 * Interface colours. Every value is a CSS variable from styles.css, so the whole UI follows the
 * light (day) and dark (iPhone dark mode) themes. `P` keeps the names of the art palette the
 * components already use: fills for buttons, pills and bars. `T` is for coloured text, a deeper
 * tone that stays readable on the light theme's cream panels.
 */
export const P = {
  /** Main text. */
  white: "var(--text)",
  /** Secondary (quiet) buttons and pills. */
  mist: "var(--neutral)",
  /** Neutral pills, disabled fills, locked items. */
  slate: "var(--slate)",
  /** Recessed surfaces (e.g. the reflex pads). */
  ink: "var(--surface-2)",
  /** Text on vivid fills. */
  outline: "var(--on-accent)",
  amber2: "var(--amber)",
  amber3: "var(--amber-soft)",
  teal2: "var(--teal)",
  green1: "var(--green-deep)",
  green2: "var(--green)",
  red2: "var(--red)",
  red3: "var(--coral)",
  purple2: "var(--purple)",
  pink: "var(--pink)",
  blue2: "var(--blue)",
  blue3: "var(--blue-soft)",
  pulso: "var(--pulso)",
  senal: "var(--senal)",
  ruido: "var(--ruido)",
} as const;

export const T = {
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  green: "var(--green-text)",
  red: "var(--red-text)",
  amber: "var(--amber-text)",
  teal: "var(--teal-text)",
  purple: "var(--purple-text)",
  blue: "var(--blue-text)",
} as const;
