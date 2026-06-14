import type { SportModule } from "@cut/sport-sdk";
import { createPgaGolfModule } from "@cut/sport-pga-golf";
import { createPgaGolfHandlers } from "./pga-golf/handlers.js";

const pgaGolfModule = createPgaGolfModule(createPgaGolfHandlers());
const modules: SportModule[] = [pgaGolfModule];

const modulesById = new Map(modules.map((module) => [module.id, module]));

export function getSportModule(sportId: string): SportModule | undefined {
  return modulesById.get(sportId);
}

export function requireSportModule(sportId: string): SportModule {
  const module = getSportModule(sportId);
  if (!module) {
    throw new Error(`No sport module registered for sportId: ${sportId}`);
  }
  return module;
}

export function listSportModules(): SportModule[] {
  return [...modules];
}

export function listRegisteredSportIds(): string[] {
  return modules.map((module) => module.id);
}
