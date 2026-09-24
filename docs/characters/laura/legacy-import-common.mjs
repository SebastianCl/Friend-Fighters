// Shared P06/P07 provenance, draft config and production-safety helpers.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export const repositoryRoot = fileURLToPath(
  new URL("../../../", import.meta.url),
);
export function repoPath(path) {
  const full = resolve(repositoryRoot, path);
  const diff = relative(repositoryRoot, full);
  if (isAbsolute(path) || diff.startsWith("..") || isAbsolute(diff))
    throw new Error(`Path outside repository: ${path}`);
  return full;
}
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const stableJson = (value) => JSON.stringify(value, null, 2) + "\n";
export async function readJson(path) {
  return JSON.parse(await readFile(repoPath(path), "utf8"));
}
export async function snapshotProduction(
  directory = "public/art/characters/laura",
) {
  const full = repoPath(directory);
  return Object.fromEntries(
    await Promise.all(
      (await readdir(full)).map(async (name) => [
        name,
        sha256(await readFile(resolve(full, name))),
      ]),
    ),
  );
}

let authoringContracts;
export async function loadAuthoringContracts() {
  if (!authoringContracts)
    authoringContracts = (async () => {
      const compiled = await build({
        stdin: {
          contents:
            'export { createUnmeasuredPoseDraft } from "./docs/characters/pose-master-contract.ts"; export { validateCharacterPackage } from "./docs/characters/config-contract.ts";',
          resolveDir: repositoryRoot,
          loader: "ts",
        },
        bundle: true,
        write: false,
        platform: "node",
        format: "esm",
        logLevel: "silent",
      });
      return import(
        "data:text/javascript;base64," +
          Buffer.from(compiled.outputFiles[0].contents).toString("base64")
      );
    })();
  return authoringContracts;
}
export function makeDraftFrame(
  resourceId,
  source,
  global,
  createUnmeasuredPoseDraft,
) {
  return {
    schemaVersion: 1,
    pipelineVersion: global.pipelineVersion,
    geometryProfileId: global.geometryProfile.id,
    characterId: "laura",
    resourceId,
    status: "draft",
    review: { status: "pending", reviewedBy: null },
    sourcePath: source.path,
    sourceTransform: null,
    poseDraft: {
      ...createUnmeasuredPoseDraft(resourceId),
      coordinateSpace: {
        imagePath: source.path,
        width: source.width,
        height: source.height,
        units: "pixels",
        origin: "top-left",
      },
    },
    canonical: null,
    output: null,
  };
}
export async function validateDraftPackage(global, spec, frameConfigs) {
  const { validateCharacterPackage } = await loadAuthoringContracts();
  const frames = new Map(
    frameConfigs.map((frame) => [
      `docs/characters/laura/legacy-frames/${frame.resourceId}.json`,
      frame,
    ]),
  );
  const hashes = new Map();
  const resolver = {
    readJson(path) {
      if (frames.has(path)) return frames.get(path);
      try {
        return JSON.parse(readFileSync(repoPath(path), "utf8"));
      } catch {
        return undefined;
      }
    },
    sha256(path) {
      if (!hashes.has(path)) {
        try {
          hashes.set(path, sha256(readFileSync(repoPath(path))));
        } catch {
          hashes.set(path, null);
        }
      }
      return hashes.get(path);
    },
  };
  return validateCharacterPackage(global, spec, resolver, "draft");
}
