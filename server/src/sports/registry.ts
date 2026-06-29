import type { SportModule } from "@cut/sport-sdk";
import { createPgaGolfModule } from "@cut/sport-pga-golf";
import { createF1Module } from "@cut/sport-f1";
import { createCommoditiesModule } from "@cut/sport-commodities";
import { createPgaGolfHandlers } from "./pga-golf/handlers.js";
import { createF1Handlers } from "./f1/handlers.js";
import { createCommoditiesHandlers } from "./commodities/handlers.js";

const pgaGolfModule = createPgaGolfModule(createPgaGolfHandlers());
const f1Module = createF1Module(createF1Handlers());
const commoditiesModule = createCommoditiesModule(createCommoditiesHandlers());
const modules: SportModule[] = [pgaGolfModule, f1Module, commoditiesModule];

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
