#!/usr/bin/env node
// Read-only CLI for P05. Paths are repository-relative; no character assets are written.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
function repoPath(path) {
  const absolute = resolve(root, path);
  const difference = relative(root, absolute);
  if (isAbsolute(path) || difference.startsWith("..") || isAbsolute(difference))
    throw new Error("Path outside repository: " + path);
  return absolute;
}
const args = process.argv.slice(2);
let globalPath = "docs/characters/pipeline-config.json";
let characterPath = null;
let integrationPath = null;
let mode = "draft";
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (flag === "--production") mode = "production";
  else if (["--global", "--character", "--integration"].includes(flag)) {
    const value = args[++i];
    if (!value || value.startsWith("--"))
      throw new Error("Missing value for " + flag);
    repoPath(value);
    if (flag === "--global") globalPath = value;
    if (flag === "--character") characterPath = value;
    if (flag === "--integration") integrationPath = value;
  } else throw new Error("Unknown argument: " + flag);
}
if (mode === "production" && characterPath === null)
  throw new Error("--production requires --character");
if (integrationPath !== null && characterPath === null)
  throw new Error("--integration requires --character");
const compiled = await build({
  entryPoints: [fileURLToPath(new URL("config-contract.ts", import.meta.url))],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { validatePipelineConfiguration, validateCharacterPackage } =
  await import(
    "data:text/javascript;base64," +
      Buffer.from(compiled.outputFiles[0].contents).toString("base64")
  );
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(repoPath(path), "utf8"));
  } catch {
    return undefined;
  }
};
const hashes = new Map();
const sha256 = (path) => {
  if (hashes.has(path)) return hashes.get(path);
  let hash = null;
  try {
    hash = createHash("sha256")
      .update(readFileSync(repoPath(path)))
      .digest("hex");
  } catch {
    /* A broken reference is reported by the validator. */
  }
  hashes.set(path, hash);
  return hash;
};
const resolver = { readJson, sha256 };
const global = readJson(globalPath);
if (global === undefined)
  throw new Error("Global configuration unreadable: " + globalPath);
const report =
  characterPath === null
    ? {
        errors: validatePipelineConfiguration(global, resolver),
        pending: [],
        productionReady: false,
      }
    : validateCharacterPackage(
        global,
        readJson(characterPath),
        resolver,
        mode,
        integrationPath === null ? undefined : readJson(integrationPath),
      );
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
