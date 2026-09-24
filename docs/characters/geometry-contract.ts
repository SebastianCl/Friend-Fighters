// P04 authoring/validation utilities. Never imported by the game; P15 owns integration.
import profile from "./geometry-profile.json";
import catalogue from "./pose-semantics.json";
import {
  validatePoseMasterDraft,
  type PoseMasterDraft,
} from "./pose-master-contract";

export const geometryProfile = profile;
export interface Point {
  x: number;
  y: number;
}
export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export interface SourceTransform {
  // Relative to P03's identified source image, NOT a new origin inferred from alpha.
  sourceOrigin: Point;
  uniformScale: number;
  translation: Point;
}
export interface AlphaExtent {
  count: number;
  bounds: Bounds | null;
}
export interface AlphaDiagnostics {
  gt0: AlphaExtent;
  gt128: AlphaExtent;
}
export interface CanonicalAnnotations {
  profileId: string;
  resourceId: string;
  sourceSpace: PoseMasterDraft["coordinateSpace"];
  sourceTransform: SourceTransform;
  landmarks: PoseMasterDraft["landmarks"];
  attributes: PoseMasterDraft["attributes"];
  groundContacts: PoseMasterDraft["groundContacts"];
  // Visual only: these points cannot reposition either simulation actor.
  interactionPoints: Record<string, Point | null>;
}
export interface GeometryReview {
  errors: string[];
  pending: string[];
}

function finitePoint(p: Point): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}
function requirePoint(p: Point): void {
  if (!finitePoint(p)) throw new RangeError("non-finite point");
}
function requireScale(scale: number): void {
  if (!Number.isFinite(scale) || scale <= 0)
    throw new RangeError("invalid scale");
}

export function sourceToCanonical(
  point: Point,
  transform: SourceTransform,
): Point {
  requirePoint(point);
  requirePoint(transform.sourceOrigin);
  requirePoint(transform.translation);
  requireScale(transform.uniformScale);
  return {
    x:
      (point.x - transform.sourceOrigin.x) * transform.uniformScale +
      transform.translation.x,
    y:
      (point.y - transform.sourceOrigin.y) * transform.uniformScale +
      transform.translation.y,
  };
}

export function canonicalToActorLocal(point: Point): Point {
  requirePoint(point);
  const { pivot, gameUnitsPerCanonicalPixel: density } = profile;
  return { x: (point.x - pivot.x) * density, y: (pivot.y - point.y) * density };
}

export function actorLocalToWorld(
  point: Point,
  actor: Point,
  facing: 1 | -1,
): Point {
  requirePoint(point);
  requirePoint(actor);
  if (facing !== 1 && facing !== -1) throw new RangeError("invalid facing");
  return { x: actor.x + facing * point.x, y: actor.y + point.y };
}

export function worldToScene(
  point: Point,
  worldOriginInScene: Point,
  pixelsPerGameUnit: number,
): Point {
  requirePoint(point);
  requirePoint(worldOriginInScene);
  requireScale(pixelsPerGameUnit);
  return {
    x: worldOriginInScene.x + point.x * pixelsPerGameUnit,
    y: worldOriginInScene.y - point.y * pixelsPerGameUnit,
  };
}

// Camera/viewport are supplied by the caller, never taken from an actor or alpha.
export function sceneToScreen(
  point: Point,
  translation: Point,
  scale: number,
): Point {
  requirePoint(point);
  requirePoint(translation);
  requireScale(scale);
  return {
    x: translation.x + point.x * scale,
    y: translation.y + point.y * scale,
  };
}

export function mirrorCanonicalPoint(point: Point): Point {
  requirePoint(point);
  return { x: 2 * profile.pivot.x - point.x, y: point.y };
}

function mapAnnotations(
  annotations: CanonicalAnnotations,
  map: (point: Point) => Point,
): CanonicalAnnotations {
  const result = structuredClone(annotations);
  for (const landmark of Object.values(result.landmarks))
    if (landmark.position !== null) landmark.position = map(landmark.position);
  for (const contact of result.groundContacts ?? [])
    if (contact.position !== null) contact.position = map(contact.position);
  for (const [id, point] of Object.entries(result.interactionPoints))
    if (point !== null) result.interactionPoints[id] = map(point);
  return result;
}

export function projectPoseAnnotations(
  draft: PoseMasterDraft,
  transform: SourceTransform,
  resourceIds: readonly string[] = catalogue.poses.map(
    (pose) => pose.resourceId,
  ),
): CanonicalAnnotations {
  const errors = validatePoseMasterDraft(draft, resourceIds);
  if (errors.length || draft.coordinateSpace === null)
    throw new Error(
      "invalid source annotations: " +
        [
          ...errors,
          ...(draft.coordinateSpace === null ? ["source image required"] : []),
        ].join(", "),
    );
  // Validate even when every measurement is still null. This point is not a landmark.
  sourceToCanonical(transform.sourceOrigin, transform);
  return mapAnnotations(
    {
      profileId: profile.id,
      resourceId: draft.resourceId,
      sourceSpace: draft.coordinateSpace,
      sourceTransform: transform,
      landmarks: draft.landmarks,
      attributes: draft.attributes,
      groundContacts: draft.groundContacts,
      interactionPoints: {},
    },
    (point) => sourceToCanonical(point, transform),
  );
}

export function mirrorCanonicalAnnotations(
  annotations: CanonicalAnnotations,
): CanonicalAnnotations {
  const result = mapAnnotations(annotations, mirrorCanonicalPoint);
  const facing = result.attributes.facing;
  result.attributes.facing =
    facing === null ? null : facing === "right" ? "left" : "right";
  return result;
}

/** Read-only RGBA measurement. Bounding boxes are diagnostics, never pivots. */
export function measureAlpha(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): AlphaDiagnostics {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    rgba.length !== width * height * 4
  )
    throw new RangeError("invalid RGBA dimensions");
  const result: AlphaDiagnostics = {
    gt0: { count: 0, bounds: null },
    gt128: { count: 0, bounds: null },
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      for (const [key, threshold] of [
        ["gt0", 0],
        ["gt128", 128],
      ] as const) {
        if (alpha <= threshold) continue;
        const extent = result[key];
        extent.count++;
        const b = extent.bounds ?? {
          left: x,
          top: y,
          right: x + 1,
          bottom: y + 1,
        };
        b.left = Math.min(b.left, x);
        b.top = Math.min(b.top, y);
        b.right = Math.max(b.right, x + 1);
        b.bottom = Math.max(b.bottom, y + 1);
        extent.bounds = b;
      }
    }
  return result;
}

export function validateCanonicalGeometry(frame: {
  width: number;
  height: number;
  pivot: Point;
  alpha: AlphaDiagnostics | null;
  annotations?: CanonicalAnnotations;
}): GeometryReview {
  const errors: string[] = [],
    pending: string[] = [];
  if (
    frame.width !== profile.frame.width ||
    frame.height !== profile.frame.height
  )
    errors.push("wrong canonical dimensions");
  if (frame.pivot.x !== profile.pivot.x || frame.pivot.y !== profile.pivot.y)
    errors.push("wrong canonical pivot");
  if (frame.alpha === null) pending.push("alpha not measured");
  for (const key of ["gt0", "gt128"] as const) {
    if (frame.alpha === null) break;
    const { count, bounds: b } = frame.alpha[key];
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      count > frame.width * frame.height ||
      (count === 0) !== (b === null) ||
      (b !== null &&
        (!Object.values(b).every(Number.isFinite) ||
          b.left < 0 ||
          b.top < 0 ||
          b.right > frame.width ||
          b.bottom > frame.height ||
          b.left >= b.right ||
          b.top >= b.bottom ||
          count > (b.right - b.left) * (b.bottom - b.top)))
    )
      errors.push("invalid alpha extent: " + key);
  }
  const all = frame.alpha?.gt0,
    core = frame.alpha?.gt128;
  if (
    all &&
    core &&
    (core.count > all.count ||
      (core.bounds &&
        all.bounds &&
        (core.bounds.left < all.bounds.left ||
          core.bounds.top < all.bounds.top ||
          core.bounds.right > all.bounds.right ||
          core.bounds.bottom > all.bounds.bottom)))
  )
    errors.push("inconsistent alpha thresholds");
  if (all && !all.bounds) errors.push("empty content");
  else if (all?.bounds) {
    const b = all.bounds,
      margin = profile.tolerances.contentMarginCanonicalPixels;
    if (
      b.left < margin ||
      b.top < margin ||
      b.right > frame.width - margin ||
      b.bottom > frame.height - margin
    )
      errors.push(
        "content margin below 8 canonical pixels; review required, do not scale to fit",
      );
  }
  const annotations = frame.annotations;
  if (!annotations) pending.push("annotations not measured");
  else {
    if (annotations.profileId !== profile.id)
      errors.push("wrong annotation profile");
    const checkPoint = (point: Point | null, label: string) => {
      if (point === null) {
        pending.push("unmeasured: " + label);
        return;
      }
      if (
        !finitePoint(point) ||
        point.x < 0 ||
        point.y < 0 ||
        point.x >= frame.width ||
        point.y >= frame.height
      )
        errors.push("point outside canonical frame: " + label);
    };
    for (const [name, landmark] of Object.entries(annotations.landmarks))
      if (landmark.position !== null || landmark.visibility !== "occluded")
        checkPoint(landmark.position, name);
    for (const [name, point] of Object.entries(annotations.interactionPoints))
      checkPoint(point, name);
    const contacts = annotations.groundContacts,
      airborne = annotations.attributes.airborne;
    if (airborne === null) pending.push("pose airborne intent unresolved");
    if (contacts === null) pending.push("contacts unresolved");
    if (
      airborne === true &&
      (contacts === null ||
        contacts.length > 0 ||
        annotations.attributes.supportLeg !== "none")
    )
      errors.push("airborne pose must have no contacts or supporting leg");
    if (airborne === false && contacts?.length === 0)
      errors.push("grounded pose needs declared contacts");
    for (const contact of contacts ?? []) {
      checkPoint(contact.position, contact.site);
      if (
        airborne === false &&
        contact.position &&
        Math.abs(contact.position.y - profile.nominalGroundY) >
          profile.tolerances.groundContactCanonicalPixels
      )
        errors.push("contact outside ground tolerance: " + contact.site);
    }
  }
  return { errors, pending };
}

export function validateScenePlacement(
  expected: Point,
  beforeRounding: Point,
  rounded: Point,
): string[] {
  const errors: string[] = [];
  if (![expected, beforeRounding, rounded].every(finitePoint))
    return ["non-finite scene placement"];
  for (const axis of ["x", "y"] as const) {
    if (
      Math.abs(expected[axis] - beforeRounding[axis]) >
      profile.tolerances.numericTransformScenePixels
    )
      errors.push("numeric transform tolerance exceeded: " + axis);
    if (
      !Number.isInteger(rounded[axis]) ||
      Math.abs(beforeRounding[axis] - rounded[axis]) >
        profile.tolerances.roundedPlacementScenePixels
    )
      errors.push("rounded placement tolerance exceeded: " + axis);
  }
  return errors;
}
