/** The outcome of a player action: done (the save changed) or refused (it didn't), with a sentence to show. */
export interface ActionResult {
  ok: boolean;
  message: string;
}

export const done = (message: string): ActionResult => ({ ok: true, message });
export const refused = (message: string): ActionResult => ({ ok: false, message });
