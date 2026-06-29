import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { pgaGolfUIPlugin } from "./pga-golf/index";
import { f1UIPlugin } from "./f1/index";
import { commoditiesUIPlugin } from "./commodities/index";

const plugins = new Map<string, SportUIPlugin>([
  ["pga-golf", pgaGolfUIPlugin],
  ["f1", f1UIPlugin],
  ["commodities", commoditiesUIPlugin],
]);

export function getSportUIPlugin(sportId: string): SportUIPlugin | undefined {
  return plugins.get(sportId);
}

export function requireSportUIPlugin(sportId: string): SportUIPlugin {
  const plugin = getSportUIPlugin(sportId);
  if (!plugin) {
    throw new Error(`No UI plugin registered for sport: ${sportId}`);
  }
  return plugin;
}

export function listRegisteredSportUIIds(): string[] {
  return [...plugins.keys()];
}
