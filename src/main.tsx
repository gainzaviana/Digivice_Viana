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
import { useMotionSensor } from "./ui/steps";
import { BattleView } from "./battle/view";

const TABS = [
  ["Compañero", "♥"],
  ["Mapa", "◈"],
  ["Sucesos", "!"],
  ["Equipo", "▦"],
  ["Terminal", "▶"],
] as const;

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
        {tab === 0 && <PartnerScreen />}
        {tab === 1 && <MapScreen />}
        {tab === 2 && <EventsScreen />}
        {tab === 3 && <SquadScreen />}
        {tab === 4 && <TerminalScreen />}
      </main>
      <nav class="tabs" role="tablist">
        {TABS.map(([name, icon], i) => (
          <button key={name} role="tab" aria-selected={tab === i} class={tab === i ? "on" : ""} onClick={() => { setTab(i); scrollTo(0, 0); }}>
            <span class="tab-icon">{icon}</span>
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
