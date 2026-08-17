import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  REJECTED_STATIC_PATH,
  resolvePublicStaticFile,
  rewritePublicStaticRequestPath,
} from "./resolvePublicStaticFile.js";

const tmpDirs: string[] = [];

function makePublicRoot(): { publicRoot: string; outside: string } {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cut-public-static-"));
  tmpDirs.push(parent);
  const publicRoot = path.join(parent, "public");
  const outside = path.join(parent, "secret.txt");
  fs.mkdirSync(path.join(publicRoot, "assets"), { recursive: true });
  fs.writeFileSync(path.join(publicRoot, "assets", "app.js"), "ok");
  fs.writeFileSync(path.join(publicRoot, "index.html"), "<html></html>");
  fs.writeFileSync(path.join(publicRoot, ".env"), "SECRET=1");
  fs.writeFileSync(outside, "leaked");
  return { publicRoot, outside };
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolvePublicStaticFile", () => {
  it("resolves a file inside public/", () => {
    const { publicRoot } = makePublicRoot();
    const resolved = resolvePublicStaticFile("/assets/app.js", { publicRoot });
    expect(resolved).toBe(fs.realpathSync.native(path.join(publicRoot, "assets", "app.js")));
  });

  it("rejects missing files", () => {
    const { publicRoot } = makePublicRoot();
    expect(resolvePublicStaticFile("/assets/missing.js", { publicRoot })).toBeNull();
  });

  it("rejects path traversal", () => {
    const { publicRoot } = makePublicRoot();
    expect(resolvePublicStaticFile("/../secret.txt", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/assets/../../secret.txt", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/%2e%2e/secret.txt", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/%252e%252e/secret.txt", { publicRoot })).toBeNull();
  });

  it("rejects dotfiles and dot directories", () => {
    const { publicRoot } = makePublicRoot();
    expect(resolvePublicStaticFile("/.env", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/assets/.hidden", { publicRoot })).toBeNull();
  });

  it("rejects directories and the public root", () => {
    const { publicRoot } = makePublicRoot();
    expect(resolvePublicStaticFile("/", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/assets", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/assets/", { publicRoot })).toBeNull();
  });

  it("rejects a symlink that escapes public/", () => {
    const { publicRoot, outside } = makePublicRoot();
    const link = path.join(publicRoot, "escape.txt");
    fs.symlinkSync(outside, link);
    expect(resolvePublicStaticFile("/escape.txt", { publicRoot })).toBeNull();
  });

  it("rejects NUL and backslash segments", () => {
    const { publicRoot } = makePublicRoot();
    expect(resolvePublicStaticFile("/assets/app.js\0.png", { publicRoot })).toBeNull();
    expect(resolvePublicStaticFile("/assets\\app.js", { publicRoot })).toBeNull();
  });
});

describe("rewritePublicStaticRequestPath", () => {
  it("returns a relative path under public/ for safe files", () => {
    const { publicRoot } = makePublicRoot();
    expect(rewritePublicStaticRequestPath("/assets/app.js", { publicRoot })).toBe(
      path.join("assets", "app.js"),
    );
  });

  it("maps unsafe paths to the rejected placeholder", () => {
    const { publicRoot } = makePublicRoot();
    expect(rewritePublicStaticRequestPath("/../secret.txt", { publicRoot })).toBe(
      REJECTED_STATIC_PATH,
    );
    expect(rewritePublicStaticRequestPath("/.env", { publicRoot })).toBe(REJECTED_STATIC_PATH);
  });
});
