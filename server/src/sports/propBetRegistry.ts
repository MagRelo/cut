import type { PropBetModule } from "@cut/sport-sdk";
import { createServerPgaGolfPropBetModule } from "./pga-golf/propBetModule.js";

const modules: PropBetModule[] = [createServerPgaGolfPropBetModule()];
const modulesBySportId = new Map(modules.map((module) => [module.sportId, module]));

export function getPropBetModule(sportId: string): PropBetModule | undefined {
  return modulesBySportId.get(sportId);
}

export function requirePropBetModule(sportId: string): PropBetModule {
  const module = getPropBetModule(sportId);
  if (!module) {
    throw new Error(`No prop bet module registered for sportId: ${sportId}`);
  }
  return module;
}
