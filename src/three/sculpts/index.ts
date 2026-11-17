import type { Sculpt } from "../sculpt";
import { forja } from "./forja";
import { ecoPliegue } from "./eco-pliegue";
import { glitchQuitina } from "./glitch-quitina";
import { teluricaEngranaje } from "./telurica-engranaje";
import { abisalVariantes } from "./abisal-variantes";
import { salvajes1 } from "./salvajes-1";
import { salvajes2 } from "./salvajes-2";

/** Every sculpted creature by species id (one file per group). */
export const SCULPTS: Record<string, Sculpt> = { ...forja, ...ecoPliegue, ...glitchQuitina, ...teluricaEngranaje, ...abisalVariantes, ...salvajes1, ...salvajes2 };
