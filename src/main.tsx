import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./styles.css";
import { game, useGame } from "./game";
import { refreshDaily, claimableCount } from "./systems/challenges";
import { StarterSelect } from "./ui/starter";
import { PartnerScreen } from "./ui/partner";
import { MapScreen } from "./ui/map";
import { EventsScreen } from "./ui/events";
import { SquadScreen } from "./ui/squad";
import { TerminalScreen } from "./ui/terminal";
import { SyncBanner, useMotionSensor } from "./ui/steps";
import { BattleView } from "./battle/view";

/** Rounded line icons for the tab bar (24×24, stroke = currentColor). */
const ICONS = {
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  map: "M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2zM9 5v12M15 7v12",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0",
  team: "M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.6-3 2.6-5 5-5s4.4 2 5 5M16 10.5a2.5 2.5 0 1 0 0-5M15.5 14c2.2.2 3.9 2 4.5 5",
  device: "M7 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM8 7h8v6H8zM9 17h.01M15 17h.01",
} as const;

const TABS = [
  ["Compañero", ICONS.heart],
  ["Mapa", ICONS.map],
  ["Sucesos", ICONS.bell],
  ["Equipo", ICONS.team],
  ["Terminal", ICONS.device],
] as const;

const TabIcon = ({ d }: { d: string }) => (
  <svg class="tab-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d={d} /></svg>
);

function App() {
  const g = useGame();
  const [tab, setTab] = useState(0);
  useMotionSensor();
  useEffect(() => {
    g.handleLocation();
    const onHash = () => g.handleLocation();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      refreshDaily(g.save, g.data);
      g.rest();
      g.changed();
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.removeEventListener("hashchange", onHash); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  if (g.battle) return <BattleView battle={g.battle} />;
  if (!g.started) return <><StarterSelect /><Toast /></>;
  const badges = [0, 0, g.save.pending.length, 0, claimableCount(g.save, g.data)];
  return (
    <div class="app">
      <main>
        <SyncBanner />
        {tab === 0 && <PartnerScreen />}
        {tab === 1 && <MapScreen />}
        {tab === 2 && <EventsScreen />}
        {tab === 3 && <SquadScreen />}
        {tab === 4 && <TerminalScreen />}
      </main>
      <nav class="tabs" role="tablist">
        {TABS.map(([name, icon], i) => (
          <button key={name} role="tab" aria-selected={tab === i} class={tab === i ? "on" : ""} onClick={() => { setTab(i); scrollTo(0, 0); }}>
            <TabIcon d={icon} />
            <span class="tab-name">{name}</span>
            {badges[i] > 0 && <span class="badge">{badges[i]}</span>}
          </button>
        ))}
      </nav>
      <Toast />
    </div>
  );
}

function Toast() {
  const g = useGame();
  if (!g.message) return null;
  return <div class="toast" role="status" onClick={() => { g.message = undefined; g.changed(); }}>{g.message}</div>;
}

render(<App />, document.getElementById("app")!);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register("./sw.js");
}
// Ask the browser to keep the save even under storage pressure.
void navigator.storage?.persist?.();
void game;
