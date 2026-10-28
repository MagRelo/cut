#!/usr/bin/env node
/**
 * Fails if platform paths import sport packages (except @cut/sport-sdk)
 * or, on the client, a sport UI folder.
 *
 * Allowed sport-package imports:
 *   - server/src/sports/** (IO + boot registries)
 *   - packages/sport-* (the packages themselves)
 *   - client/src/sports/** (UI plugins)
 *   - server/src/scripts/** (ops scripts; may target a single sport)
 *   - client/src/test/** (fixtures)
 *
 * Forbidden package imports (@cut/sport-pga-golf, @cut/sport-f1, @cut/sport-commodities):
 *   - server/src/services, lib, utils, routes, cron
 *   - client/src/lib, components, hooks, pages, contexts
 *
 * Forbidden relative imports of sports/pga-golf, sports/f1, sports/commodities:
 *   - client/src/lib, components, hooks, contexts
 *   Pages may import a sport folder for a page-level preview (Home, /dev).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SPORT_PACKAGES = ["@cut/sport-pga-golf", "@cut/sport-f1", "@cut/sport-commodities"];
const FORBIDDEN_DIRS = [
  "server/src/services",
  "server/src/lib",
  "server/src/utils",
  "server/src/routes",
  "server/src/cron",
  "client/src/lib",
  "client/src/components",
  "client/src/hooks",
  "client/src/pages",
  "client/src/contexts",
];

const packageImportRe = new RegExp(
  String.raw`from\s+["'](${SPORT_PACKAGES.map(escapeRegExp).join("|")})["']|require\(\s*["'](${SPORT_PACKAGES.map(escapeRegExp).join("|")})["']\s*\)`,
);
const fromSpecifierRe = /from\s+["']([^"']+)["']/;
const relativeSportRe = /(?:^|\/)sports\/(?:pga-golf|f1|commodities)(?:\/|$)/;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isClientFile(relFile) {
  const normalized = relFile.split(path.sep).join("/");
  return normalized.startsWith("client/");
}

function allowsRelativeSportImport(relFile) {
  const normalized = relFile.split(path.sep).join("/");
  return normalized.startsWith("client/src/pages/");
}

const violations = [];
for (const rel of FORBIDDEN_DIRS) {
  const abs = path.join(root, rel);
  for (const file of walk(abs)) {
    const relFile = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (packageImportRe.test(line)) {
        violations.push(`${relFile}:${i + 1}:${line.trim()}`);
        return;
      }
      if (!isClientFile(relFile) || allowsRelativeSportImport(relFile)) return;
      const specifier = fromSpecifierRe.exec(line)?.[1];
      if (specifier && relativeSportRe.test(specifier)) {
        violations.push(`${relFile}:${i + 1}:${line.trim()}`);
      }
    });
  }
}

if (violations.length === 0) {
  console.log("Sport boundary check passed: no sport-package imports in platform paths.");
  process.exit(0);
}

console.error("Sport boundary violations — platform paths must not import sport packages:");
console.error(
  "(Allowed: server/src/sports/**, boot registries, packages/, client/src/sports/**, client/src/test/**)\n",
);
for (const line of violations) {
  console.error(`  ${line}`);
}
console.error(
  `\n${violations.length} violation(s). Use the sport registry (requireSportModule / SportUIPlugin) instead.`,
);
process.exit(1);
