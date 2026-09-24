// P08 authoring only. No runtime imports and no mutation of P05 character/frame data.
import Ajv from "ajv";
import templateSchema from "./schemas/base-movement-template.schema.json";
import instanceSchema from "./schemas/movement-template-instance.schema.json";
import type templateDocument from "./base-movement-template.json";
import semantics from "./pose-semantics.json";
import geometry from "./geometry-profile.json";
import {
  createUnmeasuredPoseDraft,
  validatePoseMasterDraft,
  landmarkNames,
  contactSites,
  type PoseMasterDraft,
} from "./pose-master-contract";
import {
  validatePipelineConfiguration,
  validateCharacterPackage,
  type ConfigResolver,
  type ConfigReport,
} from "./config-contract";

export type BaseMovementTemplate = typeof templateDocument;
export type MovementPose = BaseMovementTemplate["poses"][number];
type Side = "left" | "right";
interface Reference {
  path: string;
  schemaVersion: number;
  sha256: string;
}
export interface MovementTemplateInstance {
  schemaVersion: 1;
  instanceVersion: "1.0.0";
  status: "draft";
  characterId: string;
  characterSpec: Reference;
  template: Reference & { templateVersion: "1.0.0" };
  lateralVariant: {
    declaration: "default" | "opposite";
    lead: Side;
    executor: Side;
    facingMirror: "preserve-anatomical-ids";
  };
  neutralPelvisReference: {
    status: "pending" | "specified";
    coordinateSpace: "canonical-frame-pixels";
    position: { x: number; y: number } | null;
    evidence: { path: string; sha256: string } | null;
  };
}
const ajv = new Ajv({ allErrors: true, strict: true });
const templateShape = ajv.compile<BaseMovementTemplate>(templateSchema);
const instanceShape = ajv.compile<MovementTemplateInstance>(instanceSchema);
const ids = semantics.poses.map((pose) => pose.resourceId);

// These signatures bind structural vocabulary to P03 identities. Physical
// support/airborne consistency is owned by P03, rather than reimplemented here.
const intentSignatures: Record<string, [string, string, string]> = {
  base_01: ["balanced-guard", "guard", "flexed-stance"],
  base_02: ["compact-guard", "compact-guard", "flexed-stance"],
  base_03: ["exploratory-guard", "exploratory-guard", "flexed-stance"],
  base_04: [
    "left-contact",
    "contralateral-swing-right-forward",
    "left-contact",
  ],
  base_05: ["left-passing", "passing-swing", "left-passing"],
  base_06: [
    "right-contact",
    "contralateral-swing-left-forward",
    "right-contact",
  ],
  base_07: ["bilateral-tuck", "guard", "bilateral-tuck"],
  base_08: ["open-crouch", "open-low", "crouched-stance"],
  base_09: ["low-reach", "right-low-reach", "crouched-stance"],
  base_10: ["crouched-guard", "compact-guard", "crouched-stance"],
  base_11: ["forearm-defense", "left-barrier", "flexed-stance"],
  base_12: ["unilateral-high-guard", "left-high-guard", "flexed-stance"],
  base_13: ["impact-recoil", "disrupted-guard", "absorbing-stance"],
  base_14: ["supine", "resting", "resting-extended"],
  base_15: ["rear-loaded-guard", "guard", "flexed-stance"],
  base_16: ["standing-straight-punch", "right-straight-punch", "flexed-stance"],
  base_17: ["right-kick-chamber", "guard", "right-chamber"],
  base_18: ["right-high-kick", "guard", "right-high-extension"],
  base_19: [
    "crouched-straight-punch",
    "right-straight-punch",
    "crouched-stance",
  ],
  base_20: [
    "hand-supported-low-kick",
    "right-hand-support",
    "right-low-extension",
  ],
  base_21: ["standing-palm-push", "bilateral-palm-push", "flexed-stance"],
  base_22: ["right-aerial-knee", "guard", "right-knee-drive"],
  base_23: ["right-aerial-kick", "guard", "right-air-extension"],
  base_24: ["crouched-palm-push", "bilateral-palm-push", "crouched-stance"],
};

// Geometric authoring constraints stay qualitative; none are bone lengths,
// joint coordinates or anatomical percentage tolerances.
const postureRules: Record<string, [string, string, string, string, string]> = {
  // family, torso orientation, head/pelvis relation, load, permitted variation
  "balanced-guard": [
    "guard",
    "upright-three-quarter",
    "above-pelvis-forward",
    "balanced",
    "guard-spacing",
  ],
  "compact-guard": [
    "guard",
    "upright-three-quarter",
    "above-pelvis-forward",
    "balanced",
    "guard-spacing",
  ],
  "exploratory-guard": [
    "guard",
    "upright-three-quarter",
    "above-pelvis-forward",
    "balanced",
    "guard-reach",
  ],
  "left-contact": [
    "walk",
    "upright",
    "above-pelvis-forward",
    "transfer-to-left",
    "stride",
  ],
  "left-passing": [
    "walk",
    "upright",
    "above-pelvis-forward",
    "left",
    "swing-clearance",
  ],
  "right-contact": [
    "walk",
    "upright",
    "above-pelvis-forward",
    "transfer-to-right",
    "stride",
  ],
  "bilateral-tuck": [
    "jump",
    "upright",
    "above-pelvis-forward",
    "none",
    "tuck-fold",
  ],
  "open-crouch": [
    "crouch",
    "crouch-upright",
    "above-lowered-pelvis",
    "balanced",
    "arm-opening",
  ],
  "low-reach": [
    "crouch",
    "forward-inclined",
    "above-lowered-pelvis",
    "balanced",
    "reach-distance",
  ],
  "crouched-guard": [
    "crouch",
    "crouch-upright",
    "above-lowered-pelvis",
    "balanced",
    "guard-spacing",
  ],
  "forearm-defense": [
    "defense",
    "upright-three-quarter",
    "behind-left-forearm",
    "balanced",
    "barrier-angle",
  ],
  "unilateral-high-guard": [
    "defense",
    "upright-three-quarter",
    "beside-left-forearm",
    "balanced",
    "high-guard-height",
  ],
  "impact-recoil": [
    "reaction",
    "recoiling",
    "recoils-with-torso",
    "balanced",
    "recoil-amplitude",
  ],
  supine: [
    "lying",
    "supine-horizontal",
    "behind-pelvis-face-up",
    "body-surfaces",
    "resting-flexion",
  ],
  "rear-loaded-guard": [
    "guard",
    "rear-turned",
    "above-pelvis-forward",
    "rear-right",
    "torso-turn",
  ],
  "standing-straight-punch": [
    "standing-attack",
    "punch-rotation",
    "above-pelvis-forward",
    "balanced",
    "punch-reach",
  ],
  "right-kick-chamber": [
    "standing-attack",
    "kick-counterbalance",
    "above-pelvis-forward",
    "left",
    "chamber-height",
  ],
  "right-high-kick": [
    "standing-attack",
    "kick-counterbalance",
    "above-pelvis-forward",
    "left",
    "kick-reach",
  ],
  "crouched-straight-punch": [
    "crouched-attack",
    "crouched-punch-rotation",
    "above-lowered-pelvis",
    "balanced",
    "punch-reach",
  ],
  "hand-supported-low-kick": [
    "crouched-attack",
    "toward-support-hand",
    "above-lowered-pelvis",
    "left-and-right-palm",
    "support-spacing",
  ],
  "standing-palm-push": [
    "standing-attack",
    "palm-push-inclined",
    "above-pelvis-forward",
    "balanced",
    "palm-spacing",
  ],
  "right-aerial-knee": [
    "aerial-attack",
    "upright",
    "above-pelvis-forward",
    "none",
    "knee-drive",
  ],
  "right-aerial-kick": [
    "aerial-attack",
    "kick-counterbalance",
    "above-pelvis-forward",
    "none",
    "kick-reach",
  ],
  "crouched-palm-push": [
    "crouched-attack",
    "crouched-palm-push",
    "above-lowered-pelvis",
    "balanced",
    "palm-spacing",
  ],
};

// Secondary freedoms are authoring parameters, never independent scale or root transforms.
const secondaryVariations: Record<string, string[]> = {
  base_01: ["stance-width"],
  base_02: ["stance-width"],
  base_03: ["stance-width"],
  base_04: ["arm-swing", "walk-pelvis-articulation"],
  base_05: ["arm-swing", "walk-pelvis-articulation"],
  base_06: ["arm-swing", "walk-pelvis-articulation"],
  base_07: ["tuck-asymmetry"],
  base_08: ["crouch-depth", "stance-width"],
  base_09: ["crouch-depth"],
  base_10: ["crouch-depth"],
  base_11: ["stance-width"],
  base_12: ["stance-width"],
  base_15: ["rear-load", "guard-spacing"],
  base_16: ["torso-turn"],
  base_17: ["counterbalance"],
  base_18: ["counterbalance"],
  base_19: ["crouch-depth"],
  base_20: ["counterbalance"],
  base_21: ["stance-width"],
  base_22: ["non-executing-leg-fold"],
  base_23: ["non-executing-leg-fold", "counterbalance"],
  base_24: ["crouch-depth"],
};

function referencedJson(
  ref: Reference,
  resolver: ConfigResolver,
  errors: string[],
) {
  const value = resolver.readJson(ref.path) as
    { schemaVersion?: number } | undefined;
  if (!value || value.schemaVersion !== ref.schemaVersion)
    errors.push(`broken/incompatible reference: ${ref.path}`);
  if (resolver.sha256(ref.path) !== ref.sha256)
    errors.push(`reference hash changed: ${ref.path}`);
  return value;
}
function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function sortedContacts(contacts: MovementPose["structure"]["contacts"]) {
  return [...contacts].sort((a, b) => a.site.localeCompare(b.site));
}
function expectedContacts(legs: string): MovementPose["structure"]["contacts"] {
  const c = (site: string, surface: string) => ({
    site,
    surface,
    supportsWeight: true,
  });
  if (
    ["bilateral-tuck", "right-knee-drive", "right-air-extension"].includes(legs)
  )
    return [];
  if (legs === "resting-extended")
    return ["back", "pelvis", "head"].map((site) => c(site, "posterior-body"));
  if (legs === "left-contact")
    return [c("left_foot", "heel"), c("right_foot", "forefoot")];
  if (legs === "right-contact")
    return [c("right_foot", "heel"), c("left_foot", "forefoot")];
  const left = c("left_foot", "sole");
  if (legs === "right-low-extension") return [left, c("right_palm", "palm")];
  if (["left-passing", "right-chamber", "right-high-extension"].includes(legs))
    return [left];
  return [left, c("right_foot", "sole")];
}

export function validateBaseMovementTemplate(
  raw: unknown,
  resolver: ConfigResolver,
): ConfigReport {
  const report: ConfigReport = {
    errors: [],
    pending: [],
    productionReady: false,
  };
  const { errors } = report;
  if (!templateShape(raw)) {
    errors.push(
      ...(templateShape.errors ?? []).map(
        (e) => `template${e.instancePath}: ${e.message}`,
      ),
    );
    return report;
  }
  const doc = raw as BaseMovementTemplate;
  const global = referencedJson(doc.references.global, resolver, errors) as
    | {
        pipelineVersion?: string;
        poseSemantics?: Reference;
        geometryProfile?: Reference;
      }
    | undefined;
  errors.push(...validatePipelineConfiguration(global, resolver));
  for (const name of ["semantics", "geometry"] as const) {
    referencedJson(doc.references[name], resolver, errors);
    const globalRef =
      name === "semantics" ? global?.poseSemantics : global?.geometryProfile;
    if (
      !globalRef ||
      ["path", "sha256", "schemaVersion"].some(
        (key) =>
          doc.references[name][key as keyof Reference] !==
          globalRef[key as keyof Reference],
      )
    )
      errors.push(`${name}: reference must agree with P05`);
  }
  if (global?.pipelineVersion !== doc.compatiblePipelineVersion)
    errors.push("incompatible pipeline version");
  const seen = new Set<string>();
  for (const pose of doc.poses) {
    const scope = pose.resourceId;
    const fail = (message: string) => errors.push(`${scope}: ${message}`);
    if (seen.has(scope)) fail("duplicate resource ID");
    seen.add(scope);
    const signature = intentSignatures[scope];
    const s = pose.structure;
    if (!signature || !same([pose.intent, s.arms, s.legs], signature))
      fail("intent/arms/legs contradict P03 identity");
    const posture = postureRules[pose.intent];
    if (
      !posture ||
      !same([pose.family, s.torso, s.headPelvis, s.load], posture.slice(0, 4))
    )
      fail("posture contradicts intent");
    const declaredVariations = pose.allowedVariations
      .map((v) => v.parameter)
      .sort();
    const expectedVariations = [
      posture?.[4],
      ...(secondaryVariations[scope] ?? []),
    ].sort();
    if (!same(declaredVariations, expectedVariations))
      fail("variation is incompatible with structural constraints");

    const aerial = [
      "bilateral-tuck",
      "right-knee-drive",
      "right-air-extension",
    ].includes(s.legs);
    if (s.airborne !== aerial) fail("airborne contradicts leg configuration");
    const pelvisRelation = aerial
      ? "shared-aerial-reference"
      : pose.family === "lying"
        ? "supine-relative-to-neutral"
        : ["crouch", "crouched-attack"].includes(pose.family)
          ? "lowered-from-neutral"
          : "relative-to-neutral";
    if (s.pelvisRelation !== pelvisRelation)
      fail("pelvis reference contradicts pose family");
    if (
      !same(
        sortedContacts(s.contacts),
        sortedContacts(expectedContacts(s.legs)),
      )
    )
      fail("support surfaces contradict leg configuration");
    let hands = { left: "fist", right: "fist" };
    if (
      s.arms.includes("swing") ||
      ["disrupted-guard", "resting"].includes(s.arms)
    )
      hands = { left: "relaxed", right: "relaxed" };
    if (["open-low", "bilateral-palm-push"].includes(s.arms))
      hands = { left: "open", right: "open" };
    if (["right-low-reach", "right-hand-support"].includes(s.arms))
      hands.right = "open";
    if (!same(s.hands, hands)) fail("hands contradict arm configuration");
    const executor =
      [
        "right-low-reach",
        "right-straight-punch",
        "right-hand-support",
      ].includes(s.arms) ||
      (s.legs.startsWith("right-") && s.legs !== "right-contact")
        ? "right"
        : s.arms === "bilateral-palm-push"
          ? "both"
          : "none";
    if (s.executor !== executor)
      fail("executor contradicts anatomical authoring convention");
    const direction =
      executor !== "none"
        ? "forward"
        : pose.family === "lying"
          ? "face-up"
          : pose.family === "reaction"
            ? "backward"
            : "neutral";
    if (s.direction !== direction) fail("direction contradicts intention");

    // Adapt structural assertions to P03 with null positions. This is NOT a
    // measured character frame, nor a confirmation of Laura's anatomical sides.
    const draft = createUnmeasuredPoseDraft(scope);
    draft.attributes = {
      ...draft.attributes,
      lateralityConfirmed: true,
      hands: s.hands as PoseMasterDraft["attributes"]["hands"],
      supportLeg: s.supportLeg as PoseMasterDraft["attributes"]["supportLeg"],
      airborne: s.airborne,
    };
    draft.groundContacts = s.contacts.map((c) => ({
      site: c.site as (typeof contactSites)[number],
      position: null,
      supportsWeight: c.supportsWeight,
    }));
    errors.push(
      ...validatePoseMasterDraft(draft, ids).map((e) => `${scope}: ${e}`),
    );

    const all = [...pose.criticalLandmarks, ...pose.variableLandmarks];
    if (
      all.length !== landmarkNames.length ||
      new Set(all).size !== landmarkNames.length ||
      landmarkNames.some((name) => !all.includes(name))
    )
      fail("critical/variable landmarks must partition the 22 P03 landmarks");
    const critical = new Set([
      "head_center",
      "neck",
      "sternum",
      "pelvis_center",
    ]);
    const sides = ["left", "right"];
    if (
      ["walk", "jump", "lying", "aerial-attack"].includes(pose.family) ||
      ["right-chamber", "right-high-extension"].includes(s.legs)
    )
      for (const side of sides)
        for (const joint of ["hip", "knee", "ankle", "heel", "toe"])
          critical.add(`${side}_${joint}`);
    else
      for (const side of sides)
        for (const joint of ["shoulder", "elbow", "wrist", "palm"])
          critical.add(`${side}_${joint}`);
    if (["crouch", "crouched-attack"].includes(pose.family))
      for (const side of sides)
        for (const joint of ["hip", "knee", "heel"])
          critical.add(`${side}_${joint}`);
    if (s.arms === "right-hand-support")
      for (const name of landmarkNames) critical.add(name);
    if (["left-contact", "right-contact"].includes(s.legs))
      for (const side of sides)
        for (const joint of ["shoulder", "elbow"])
          critical.add(`${side}_${joint}`);
    for (const name of critical)
      if (!pose.criticalLandmarks.includes(name))
        fail(`essential landmark cannot be variable: ${name}`);
  }
  for (const id of ids)
    if (!seen.has(id)) errors.push(`missing resource: ${id}`);
  report.pending = [
    "Character anatomy, stature and neutralPelvisReference require character-specific evidence.",
    "Final landmarks, surface-contact positions and control images are not generated by P08.",
    "Shared camera/projection parameters require visual validation; anatomical percentage tolerance remains unset.",
  ];
  return report;
}

export function validateMovementTemplateInstance(
  raw: unknown,
  resolver: ConfigResolver,
): ConfigReport {
  const report: ConfigReport = {
    errors: [],
    pending: [],
    productionReady: false,
  };
  const { errors, pending } = report;
  if (!instanceShape(raw)) {
    errors.push(
      ...(instanceShape.errors ?? []).map(
        (e) => `instance${e.instancePath}: ${e.message}`,
      ),
    );
    return report;
  }
  const instance = raw as MovementTemplateInstance;
  const template = referencedJson(instance.template, resolver, errors) as
    BaseMovementTemplate | undefined;
  const character = referencedJson(instance.characterSpec, resolver, errors) as
    { identity?: { id: string } } | undefined;
  const templateReport = validateBaseMovementTemplate(template, resolver);
  errors.push(...templateReport.errors);
  pending.push(...templateReport.pending);
  if (templateReport.errors.length || !template) return report;
  if (template.templateVersion !== instance.template.templateVersion)
    errors.push("instance/template version mismatch");
  const specReport = validateCharacterPackage(
    resolver.readJson(template.references.global.path),
    character,
    resolver,
    "draft",
  );
  errors.push(...specReport.errors);
  pending.push(...specReport.pending);
  if (character?.identity?.id !== instance.characterId)
    errors.push("character identity mismatch");
  const v = instance.lateralVariant;
  if (
    v.lead !== (v.declaration === "default" ? "left" : "right") ||
    v.executor === v.lead
  )
    errors.push(
      "lateral variant must explicitly map distinct lead/executor roles",
    );
  const pelvis = instance.neutralPelvisReference;
  if (pelvis.status === "pending") {
    if (pelvis.position !== null || pelvis.evidence !== null)
      errors.push(
        "pending pelvis cannot contain specified coordinates/evidence",
      );
    pending.push("neutralPelvisReference pending");
  } else {
    const p = pelvis.position;
    if (
      !p ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < 0 ||
      p.y < 0 ||
      p.x >= geometry.frame.width ||
      p.y >= geometry.frame.height
    )
      errors.push("specified pelvis must be inside the P04 frame");
    if (
      !pelvis.evidence ||
      resolver.sha256(pelvis.evidence.path) !== pelvis.evidence.sha256
    )
      errors.push(
        "specified pelvis requires unbroken character-specific evidence",
      );
  }
  return report;
}
