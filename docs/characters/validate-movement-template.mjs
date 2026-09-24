#!/usr/bin/env node
// Read-only P08 validation. No images, fixtures or compiled modules are written.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = fileURLToPath(new URL("../../", import.meta.url));
function repoPath(path) {
  const result = resolve(root, path);
  const rel = relative(root, result);
  if (isAbsolute(path) || rel.startsWith("..") || isAbsolute(rel))
    throw new Error("Path outside repository");
  return result;
}
const resolver = {
  readJson(path) {
    try {
      return JSON.parse(readFileSync(repoPath(path), "utf8"));
    } catch {
      return undefined;
    }
  },
  sha256(path) {
    try {
      return createHash("sha256")
        .update(readFileSync(repoPath(path)))
        .digest("hex");
    } catch {
      return null;
    }
  },
};
const args = process.argv.slice(2);
let templatePath = "docs/characters/base-movement-template.json";
let instancePath = null;
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (!["--template", "--instance"].includes(flag))
    throw new Error("Unknown argument: " + flag);
  const value = args[++i];
  if (!value || value.startsWith("--"))
    throw new Error("Missing value for " + flag);
  repoPath(value);
  if (flag === "--template") templatePath = value;
  else instancePath = value;
}
const compiled = await build({
  entryPoints: [
    fileURLToPath(new URL("base-movement-contract.ts", import.meta.url)),
  ],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const api = await import(
  "data:text/javascript;base64," +
    Buffer.from(compiled.outputFiles[0].contents).toString("base64")
);
const reports = [
  api.validateBaseMovementTemplate(resolver.readJson(templatePath), resolver),
];
if (instancePath)
  reports.push(
    api.validateMovementTemplateInstance(
      resolver.readJson(instancePath),
      resolver,
    ),
  );
const report = {
  errors: reports.flatMap((r) => r.errors),
  pending: [...new Set(reports.flatMap((r) => r.pending))],
  productionReady: false,
};
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
