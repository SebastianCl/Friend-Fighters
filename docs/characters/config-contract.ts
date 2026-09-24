// P05 configuration boundary. JSON Schema checks shape; P03/P04 own pose/geometry rules.
// No game runtime imports this module.
import Ajv from "ajv";
import globalSchema from "./schemas/global.schema.json";
import characterSchema from "./schemas/character.schema.json";
import frameSchema from "./schemas/frame.schema.json";
import integrationSchema from "./schemas/integration.schema.json";
import approvedSemantics from "./pose-semantics.json";
import approvedGeometry from "./geometry-profile.json";
import {
  createUnmeasuredPoseDraft,
  validatePoseMasterDraft,
  type PoseMasterDraft,
} from "./pose-master-contract";
import {
  projectPoseAnnotations,
  sourceToCanonical,
  validateCanonicalGeometry,
  type AlphaDiagnostics,
  type Point,
  type SourceTransform,
} from "./geometry-contract";

const ajv = new Ajv({ allErrors: true, strict: true });
const schemas = {
  global: ajv.compile(globalSchema),
  character: ajv.compile(characterSchema),
  frame: ajv.compile(frameSchema),
  integration: ajv.compile(integrationSchema),
};

export interface ConfigResolver {
  readJson(path: string): unknown | undefined;
  sha256(path: string): string | null;
}
export interface ConfigReport {
  errors: string[];
  pending: string[];
  productionReady: boolean;
}
export type ValidationMode = "draft" | "production";

interface DocumentRef {
  path: string;
  schemaVersion: number;
  sha256: string;
}
interface GlobalConfig {
  schemaVersion: number;
  pipelineVersion: string;
  sourceInventory: DocumentRef;
  poseSemantics: DocumentRef;
  geometryProfile: DocumentRef & { id: string };
  grabResourceIds: string[];
}
interface SourceRecord {
  path: string;
  sha256: string;
  width: number;
  height: number;
}
interface Inventory {
  schemaVersion: number;
  files: SourceRecord[];
}
interface ResourceEntry {
  id: string;
  status: "pending" | "approved";
  framePath: string | null;
}
interface Review {
  status: "pending" | "approved";
  reviewedBy: string | null;
}
interface CharacterSpec {
  schemaVersion: number;
  pipelineVersion: string;
  geometryProfileId: string;
  status: "draft" | "production-ready";
  identity: { id: string; displayName: string | null; revision: number };
  review: Review;
  sources: {
    path: string;
    role: "legacy" | "design" | "master" | "candidate";
  }[];
  visual: {
    designReferencePath: string | null;
    masterReferencePath: string | null;
    statureGameUnits: number | null;
    proportions: Record<string, number> | null;
    appearanceNotes: string | null;
  };
  resources: ResourceEntry[];
}
interface FrameConfig {
  schemaVersion: number;
  pipelineVersion: string;
  geometryProfileId: string;
  characterId: string;
  resourceId: string;
  status: "draft" | "approved";
  review: Review;
  sourcePath: string | null;
  sourceTransform: SourceTransform | null;
  poseDraft: PoseMasterDraft;
  canonical: {
    width: number;
    height: number;
    pivot: Point;
    alpha: AlphaDiagnostics | null;
    interactionPoints: Record<string, Point | null>;
  } | null;
  output: { path: string; sha256: string } | null;
}
interface IntegrationConfig {
  schemaVersion: number;
  pipelineVersion: string;
  characterId: string;
  status: "pending" | "verified";
  engineMapPath: string | null;
  engineMapSchemaVersion: number;
}

function shape(
  kind: keyof typeof schemas,
  value: unknown,
  scope: string,
  errors: string[],
): boolean {
  const validator = schemas[kind];
  if (validator(value)) return true;
  for (const issue of validator.errors ?? [])
    errors.push(
      `${scope}${issue.instancePath || ""}: ${issue.message ?? "invalid"}`,
    );
  return false;
}
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function matchesReview(
  status: "draft" | "production-ready" | "approved",
  review: Review,
  scope: string,
  errors: string[],
) {
  const approved = status === "approved" || status === "production-ready";
  if ((review.status === "approved") !== approved)
    errors.push(`${scope}: status and review disagree`);
  if ((review.reviewedBy !== null) !== (review.status === "approved"))
    errors.push(`${scope}: reviewer and review status disagree`);
}
function pendingValue(value: unknown, scope: string, pending: string[]) {
  if (value === null || value === undefined)
    pending.push(`${scope} not measured`);
}
function uniqueIds(ids: string[], scope: string, errors: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${scope}: duplicate ID ${id}`);
    seen.add(id);
  }
}
function normalizeHash(hash: string | null) {
  return hash?.toLowerCase() ?? null;
}

function validateGlobal(
  raw: unknown,
  resolver: ConfigResolver,
  errors: string[],
): { config: GlobalConfig; inventory: Inventory; ids: string[] } | null {
  if (!shape("global", raw, "global", errors)) return null;
  const config = raw as GlobalConfig;
  if (config.geometryProfile.id !== approvedGeometry.id)
    errors.push("global: incompatible geometry profile ID");
  if (config.grabResourceIds.join(",") !== "grab_01,grab_02,grab_03")
    errors.push("global: grab IDs differ from P02");
  for (const [name, reference] of [
    ["P01", config.sourceInventory],
    ["P03", config.poseSemantics],
    ["P04", config.geometryProfile],
  ] as const)
    if (normalizeHash(resolver.sha256(reference.path)) !== reference.sha256)
      errors.push(`global: broken or changed ${name} reference hash`);
  const inventory = resolver.readJson(config.sourceInventory.path);
  const semantics = resolver.readJson(config.poseSemantics.path);
  const geometry = resolver.readJson(config.geometryProfile.path);
  if (
    !isObject(inventory) ||
    inventory.schemaVersion !== config.sourceInventory.schemaVersion ||
    !Array.isArray(inventory.files)
  )
    errors.push("global: broken or incompatible P01 inventory reference");
  if (
    !isObject(semantics) ||
    semantics.schemaVersion !== config.poseSemantics.schemaVersion ||
    JSON.stringify(semantics) !== JSON.stringify(approvedSemantics)
  )
    errors.push("global: broken or changed P03 semantics reference");
  if (
    !isObject(geometry) ||
    geometry.schemaVersion !== config.geometryProfile.schemaVersion ||
    geometry.id !== config.geometryProfile.id ||
    JSON.stringify(geometry) !== JSON.stringify(approvedGeometry)
  )
    errors.push("global: broken or changed P04 profile reference");
  if (errors.length || !isObject(inventory) || !Array.isArray(inventory.files))
    return null;
  const files = inventory.files as unknown[];
  const paths: string[] = [];
  for (const item of files) {
    if (
      !isObject(item) ||
      typeof item.path !== "string" ||
      !/^[0-9a-f]{64}$/.test(String(item.sha256)) ||
      !Number.isInteger(item.width) ||
      !Number.isInteger(item.height) ||
      Number(item.width) <= 0 ||
      Number(item.height) <= 0
    ) {
      errors.push("global: invalid P01 inventory record");
      continue;
    }
    paths.push(item.path);
  }
  uniqueIds(paths, "global inventory", errors);
  const ids = [
    ...approvedSemantics.poses.map((pose) => pose.resourceId),
    ...config.grabResourceIds,
  ];
  uniqueIds(ids, "global catalogue", errors);
  const expectedBaseIds = Array.from(
    { length: 24 },
    (_, i) => `base_${String(i + 1).padStart(2, "0")}`,
  );
  if (
    approvedSemantics.poses.map((pose) => pose.resourceId).join(",") !==
    expectedBaseIds.join(",")
  )
    errors.push(
      "global: P03 base catalogue must contain base_01 through base_24",
    );
  if (errors.length) return null;
  return { config, inventory: inventory as unknown as Inventory, ids };
}

function validateFrame(
  raw: unknown,
  spec: CharacterSpec,
  global: GlobalConfig,
  ids: readonly string[],
  inventory: Inventory,
  resolver: ConfigResolver,
  expectedId: string,
  scope: string,
  errors: string[],
  pending: string[],
): FrameConfig | null {
  if (!shape("frame", raw, scope, errors)) return null;
  const frame = raw as FrameConfig;
  if (
    frame.pipelineVersion !== global.pipelineVersion ||
    frame.geometryProfileId !== global.geometryProfile.id
  )
    errors.push(`${scope}: incompatible pipeline/profile version`);
  if (frame.characterId !== spec.identity.id || frame.resourceId !== expectedId)
    errors.push(`${scope}: character/resource ID mismatch`);
  if (!ids.includes(frame.resourceId))
    errors.push(`${scope}: unknown resource ID`);
  matchesReview(frame.status, frame.review, scope, errors);
  const poseErrors = validatePoseMasterDraft(frame.poseDraft, ids);
  errors.push(...poseErrors.map((message) => `${scope}: P03 ${message}`));
  if (frame.poseDraft.resourceId !== frame.resourceId)
    errors.push(`${scope}: pose/resource ID mismatch`);
  if (frame.sourcePath !== null) {
    if (!spec.sources.some((source) => source.path === frame.sourcePath))
      errors.push(`${scope}: source not declared by character`);
    const source = inventory.files.find(
      (item) => item.path === frame.sourcePath,
    );
    if (!source) errors.push(`${scope}: source absent from P01`);
    else if (normalizeHash(resolver.sha256(frame.sourcePath)) !== source.sha256)
      errors.push(`${scope}: source missing or hash differs from P01`);
    const space = frame.poseDraft.coordinateSpace;
    if (
      space &&
      source &&
      (space.imagePath !== frame.sourcePath ||
        space.width !== source.width ||
        space.height !== source.height)
    )
      errors.push(`${scope}: P03 source coordinate space differs from P01`);
  } else pending.push(`${scope}: source pending`);
  if (frame.poseDraft.coordinateSpace && frame.sourcePath === null)
    errors.push(`${scope}: source coordinates without source reference`);
  if (frame.sourceTransform === null)
    pending.push(`${scope}: source transform pending`);
  else {
    try {
      const result = sourceToCanonical(
        frame.sourceTransform.sourceOrigin,
        frame.sourceTransform,
      );
      const space = frame.poseDraft.coordinateSpace;
      if (space)
        for (const corner of [
          { x: 0, y: 0 },
          { x: space.width, y: space.height },
        ]) {
          const projected = sourceToCanonical(corner, frame.sourceTransform);
          if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y))
            throw new RangeError("overflow");
        }
      if (!Number.isFinite(result.x) || !Number.isFinite(result.y))
        throw new RangeError("overflow");
    } catch {
      errors.push(`${scope}: invalid source transform`);
    }
  }
  if (frame.canonical === null)
    pending.push(`${scope}: canonical frame pending`);
  else {
    let annotations;
    if (
      frame.sourceTransform &&
      frame.poseDraft.coordinateSpace &&
      poseErrors.length === 0
    ) {
      try {
        annotations = projectPoseAnnotations(
          frame.poseDraft,
          frame.sourceTransform,
          ids,
        );
      } catch {
        errors.push(`${scope}: failed to project P03 annotations`);
      }
    }
    // P04 checks canonical interaction points even if source landmarks are pending.
    if (!annotations) {
      const unmeasured = createUnmeasuredPoseDraft(frame.resourceId);
      annotations = {
        profileId: global.geometryProfile.id,
        resourceId: frame.resourceId,
        sourceSpace: null,
        sourceTransform: frame.sourceTransform ?? {
          sourceOrigin: { x: 0, y: 0 },
          uniformScale: 1,
          translation: { x: 0, y: 0 },
        },
        landmarks: unmeasured.landmarks,
        attributes: unmeasured.attributes,
        groundContacts: null,
        interactionPoints: {},
      };
    }
    annotations.interactionPoints = frame.canonical.interactionPoints;
    const review = validateCanonicalGeometry({
      ...frame.canonical,
      annotations,
    });
    errors.push(...review.errors.map((message) => `${scope}: P04 ${message}`));
    pending.push(...review.pending.map((message) => `${scope}: ${message}`));
  }
  if (frame.output === null) pending.push(`${scope}: output pending`);
  else if (
    normalizeHash(resolver.sha256(frame.output.path)) !== frame.output.sha256
  )
    errors.push(`${scope}: output missing or hash mismatch`);
  if (frame.status === "approved") {
    if (
      frame.sourcePath === null ||
      frame.sourceTransform === null ||
      frame.canonical?.alpha === null ||
      frame.canonical === null ||
      frame.output === null
    )
      errors.push(`${scope}: approved frame contains pending data`);
    if (pending.some((message) => message.startsWith(`${scope}:`)))
      errors.push(`${scope}: approved frame has unmeasured annotations`);
    if (
      frame.poseDraft.attributes.facing === null ||
      !frame.poseDraft.attributes.lateralityConfirmed ||
      Object.values(frame.poseDraft.attributes.hands).some(
        (hand) => hand === null,
      ) ||
      frame.poseDraft.attributes.supportLeg === null ||
      frame.poseDraft.attributes.airborne === null ||
      frame.poseDraft.groundContacts === null ||
      frame.poseDraft.groundContacts.some(
        (contact) =>
          contact.position === null || contact.supportsWeight === null,
      ) ||
      Object.values(frame.poseDraft.landmarks).some(
        (landmark) =>
          landmark.visibility === "unreviewed" ||
          (landmark.visibility === "visible" && landmark.position === null),
      )
    )
      errors.push(`${scope}: approved frame has unresolved P03 anatomy`);
  }
  return frame;
}

function validateIntegration(
  raw: unknown,
  global: GlobalConfig,
  spec: CharacterSpec,
  ids: readonly string[],
  inventory: Inventory,
  resolver: ConfigResolver,
  errors: string[],
  pending: string[],
) {
  if (!shape("integration", raw, "integration", errors)) return;
  const integration = raw as IntegrationConfig;
  if (
    integration.pipelineVersion !== global.pipelineVersion ||
    integration.characterId !== spec.identity.id
  )
    errors.push("integration: version/character mismatch");
  if (integration.status === "verified" && integration.engineMapPath === null)
    errors.push("integration: verified without engine-map");
  if (integration.status === "pending")
    pending.push("integration pending for P15");
  if (integration.engineMapPath === null) return;
  const map = resolver.readJson(integration.engineMapPath);
  if (
    !isObject(map) ||
    map.schemaVersion !== integration.engineMapSchemaVersion ||
    map.character !== spec.identity.id ||
    map.meaning !== "engine-usage-only" ||
    !Array.isArray(map.resources)
  ) {
    errors.push("integration: broken or incompatible engine-map reference");
    return;
  }
  const seenIds = new Set<string>(),
    seenKeys = new Set<string>();
  for (const entry of map.resources) {
    if (
      !isObject(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.sourcePath !== "string" ||
      !Array.isArray(entry.engineKeys) ||
      entry.category !== (entry.id.startsWith("base_") ? "base" : "grab") ||
      typeof entry.used !== "boolean" ||
      typeof entry.reused !== "boolean" ||
      entry.used !== entry.engineKeys.length > 0 ||
      entry.reused !== entry.engineKeys.length > 1
    ) {
      errors.push("integration: invalid engine-map resource");
      continue;
    }
    const source = inventory.files.find(
      (item) => item.path === entry.sourcePath,
    );
    if (
      !source ||
      normalizeHash(resolver.sha256(entry.sourcePath)) !== source.sha256
    )
      errors.push(`integration: broken P01 source reference ${entry.id}`);
    if (!ids.includes(entry.id))
      errors.push(`integration: unknown resource ${entry.id}`);
    if (seenIds.has(entry.id))
      errors.push(`integration: duplicate resource ${entry.id}`);
    seenIds.add(entry.id);
    for (const key of entry.engineKeys) {
      if (typeof key !== "string" || !key)
        errors.push("integration: invalid engine key");
      else if (seenKeys.has(key))
        errors.push(`integration: duplicate engine key ${key}`);
      seenKeys.add(key);
    }
  }
  if (integration.status === "verified" && ids.some((id) => !seenIds.has(id)))
    errors.push("integration: verified map missing resources");
}

/** Pure configuration gate. References come from the caller; no files or assets are changed. */
export function validateCharacterPackage(
  rawGlobal: unknown,
  rawSpec: unknown,
  resolver: ConfigResolver,
  mode: ValidationMode = "draft",
  rawIntegration?: unknown,
): ConfigReport {
  const errors: string[] = [],
    pending: string[] = [];
  const context = validateGlobal(rawGlobal, resolver, errors);
  if (!context) return { errors, pending, productionReady: false };
  if (!shape("character", rawSpec, "character", errors))
    return { errors, pending, productionReady: false };
  const spec = rawSpec as CharacterSpec,
    { config: global, inventory, ids } = context;
  if (
    spec.pipelineVersion !== global.pipelineVersion ||
    spec.geometryProfileId !== global.geometryProfile.id
  )
    errors.push("character: incompatible pipeline/profile version");
  matchesReview(spec.status, spec.review, "character", errors);
  const complete = mode === "production" || spec.status === "production-ready";
  if (mode === "production" && spec.status !== "production-ready")
    errors.push("character: production requires production-ready status");
  const inventoryByPath = new Map(
    inventory.files.map((item) => [item.path, item]),
  );
  uniqueIds(
    spec.sources.map((source) => `${source.path}#${source.role}`),
    "character sources",
    errors,
  );
  for (const source of spec.sources) {
    const registered = inventoryByPath.get(source.path);
    if (!registered)
      errors.push(`character: source absent from P01 ${source.path}`);
    else if (normalizeHash(resolver.sha256(source.path)) !== registered.sha256)
      errors.push(
        `character: source missing or hash differs from P01 ${source.path}`,
      );
  }
  for (const [role, path] of [
    ["design", spec.visual.designReferencePath],
    ["master", spec.visual.masterReferencePath],
  ] as const) {
    if (path === null) pending.push(`character: ${role} reference pending`);
    else if (
      !spec.sources.some(
        (source) => source.path === path && source.role === role,
      )
    )
      errors.push(
        `character: ${role} reference not declared with matching role`,
      );
  }
  pendingValue(spec.identity.displayName, "character: display name", pending);
  pendingValue(spec.visual.statureGameUnits, "character: stature", pending);
  pendingValue(spec.visual.proportions, "character: proportions", pending);
  pendingValue(spec.visual.appearanceNotes, "character: appearance", pending);
  const resourceIds = spec.resources.map((entry) => entry.id);
  uniqueIds(resourceIds, "character resources", errors);
  const paths = spec.resources
    .map((entry) => entry.framePath)
    .filter((path): path is string => path !== null);
  uniqueIds(paths, "character frame paths", errors);
  for (const entry of spec.resources) {
    if (!ids.includes(entry.id))
      errors.push(`character: unknown resource ID ${entry.id}`);
    if (entry.status === "approved" && entry.framePath === null)
      errors.push(`character: approved resource missing frame ${entry.id}`);
    if (entry.framePath === null) {
      pending.push(`character: frame pending ${entry.id}`);
      continue;
    }
    const frame = validateFrame(
      resolver.readJson(entry.framePath),
      spec,
      global,
      ids,
      inventory,
      resolver,
      entry.id,
      `frame ${entry.id}`,
      errors,
      pending,
    );
    if (
      frame &&
      (entry.status === "approved") !== (frame.status === "approved")
    )
      errors.push(`character: resource/frame approval conflict ${entry.id}`);
    if (entry.status === "pending")
      pending.push(`character: resource pending ${entry.id}`);
  }
  if (complete)
    for (const id of ids)
      if (!resourceIds.includes(id))
        pending.push(`character: missing resource ${id}`);
  if (rawIntegration !== undefined)
    validateIntegration(
      rawIntegration,
      global,
      spec,
      ids,
      inventory,
      resolver,
      errors,
      pending,
    );
  if (complete)
    errors.push(...pending.map((message) => `production pending: ${message}`));
  return {
    errors,
    pending,
    productionReady: complete && errors.length === 0 && pending.length === 0,
  };
}

/** Validate only the approved global configuration, before any Character Spec exists. */
export function validatePipelineConfiguration(
  rawGlobal: unknown,
  resolver: ConfigResolver,
): string[] {
  const errors: string[] = [];
  validateGlobal(rawGlobal, resolver, errors);
  return errors;
}
