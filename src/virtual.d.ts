declare module "virtual:creature-art" {
  /** File name → bundled URL, only for files named after a species (see vite.config.ts). */
  const files: Record<string, string>;
  export default files;
}
