// P09 authoring only. These functions never import or mutate simulation/rendering.
import Ajv from "ajv";
import templateSchema from "./schemas/grab-visual-template.schema.json";
import compositionSchema from "./schemas/grab-composition.schema.json";
import gestureSchema from "./schemas/interaction-hand-gestures.schema.json";
import type templateDocument from "./grab-visual-template.json";
import {
  landmarkNames,
  createUnmeasuredPoseDraft,
  validatePoseMasterDraft,
  type PoseMasterDraft,
} from "./pose-master-contract";
import {
  geometryProfile,
  canonicalToActorLocal,
  actorLocalToWorld,
  type Point,
} from "./geometry-contract";
import {
  validateBaseMovementTemplate,
  validateMovementTemplateInstance,
} from "./base-movement-contract";
import type { ConfigResolver, ConfigReport } from "./config-contract";

export type InteractionRole = "attacker" | "victim";
export type InteractionHandGesture =
  Exclude<PoseMasterDraft["attributes"]["hands"]["left"], null> | "grasp";
interface Reference {
  path: string;
  sha256: string;
}
export interface InteractionAnchor {
  id: string;
  owner: InteractionRole;
  laterality: "left" | "right";
  surfaceId: string;
  coordinateSpace: "canonical-frame-pixels";
  position: Point | null;
  surfaceOrientation: Point | null;
  provenance: Reference | null;
  measurementStatus: "pending" | "authored" | "measured";
  review: { status: "pending" | "approved"; reviewedBy: string | null };
}
export type GrabVisualTemplate = Omit<typeof templateDocument, "anchors"> & {
  anchors: InteractionAnchor[];
};
interface Pairing {
  id: string;
  attackerAnchor: string;
  victimAnchor: string;
}
interface Part {
  owner: InteractionRole;
  part: string;
}
export interface GrabComposition {
  schemaVersion: 1;
  compositionVersion: "1.0.0";
  status: "draft";
  template: Reference;
  geometryProfileId: string;
  resourceId: string;
  actors: Record<
    InteractionRole,
    {
      actorId: string;
      movementInstance: Reference | null;
      root: Point | null;
      facing: 1 | -1 | null;
      receivedStance: "standing" | "crouching" | null;
    }
  >;
  anchors: InteractionAnchor[];
  pairing: Pairing[];
  pairingReview: {
    status: "pending" | "approved";
    evidence: Reference | null;
    reviewedBy: string | null;
  };
  activeContacts: string[];
  mechanicalPhase: string | null;
  globalVisualOffsets: "forbidden";
  occlusion: {
    status: "pending" | "reviewed";
    relations: { front: Part; back: Part }[];
    requiresLayering: boolean | null;
    evidence: Reference | null;
  };
  feasibility: {
    status: "pending" | "compatible" | "incompatible";
    derivation: "anatomy-articulation-surfaces-facing";
    rootDistanceRangeGameUnits: { min: number; max: number } | null;
    contactToleranceCanonicalPixels: number | null;
    evidence: Reference | null;
    reasons: string[];
  };
}
export interface GrabReport extends ConfigReport {
  incompatibilities: string[];
}
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(gestureSchema);
const templateShape = ajv.compile<GrabVisualTemplate>(templateSchema);
const compositionShape = ajv.compile<GrabComposition>(compositionSchema);
const ids = ["grab_01", "grab_02", "grab_03"];
const roles: InteractionRole[] = ["attacker", "victim"];
const contactIds = ["left_grip", "right_grip"];
const expectedAnchors = Object.fromEntries(
  roles.flatMap((owner) =>
    ["left", "right"].map((side) => {
      const part = owner === "attacker" ? "grip" : "upper_torso";
      return [
        `${side}_${part}_contact`,
        { owner, side, surface: `${owner}_${side}_${part}_surface` },
      ];
    }),
  ),
);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a: string[], b: string[]) =>
  same([...a].sort(), [...b].sort());
const freshReport = (): GrabReport => ({
  errors: [],
  pending: [],
  productionReady: false,
  incompatibilities: [],
});

function checkReference(
  ref: Reference,
  resolver: ConfigResolver,
  errors: string[],
) {
  if (resolver.sha256(ref.path) !== ref.sha256)
    errors.push(`broken/changed reference: ${ref.path}`);
  return resolver.readJson(ref.path);
}
function validateAnchors(
  anchors: InteractionAnchor[],
  resolver: ConfigResolver,
  report: GrabReport,
  templateOnly: boolean,
) {
  if (
    !sameSet(
      anchors.map((a) => a.id),
      Object.keys(expectedAnchors),
    )
  )
    report.errors.push(
      "anchors: exactly four distinct anatomical anchors required",
    );
  for (const a of anchors) {
    const expected = expectedAnchors[a.id];
    if (
      !expected ||
      a.owner !== expected.owner ||
      a.laterality !== expected.side ||
      a.surfaceId !== expected.surface
    )
      report.errors.push(`anchor ${a.id}: owner/laterality/surface mismatch`);
    if (a.measurementStatus === "pending") {
      if (
        a.position !== null ||
        a.surfaceOrientation !== null ||
        a.provenance !== null ||
        a.review.status !== "pending"
      )
        report.errors.push(
          `anchor ${a.id}: pending contradicts measured/approved data`,
        );
      report.pending.push(`anchor ${a.id}: measurement pending`);
    } else {
      if (templateOnly)
        report.errors.push(
          `anchor ${a.id}: global template cannot contain instance coordinates`,
        );
      if (!a.position || !a.provenance)
        report.errors.push(`anchor ${a.id}: position and provenance required`);
    }
    if (
      a.position &&
      (!Number.isFinite(a.position.x) ||
        !Number.isFinite(a.position.y) ||
        a.position.x < 0 ||
        a.position.y < 0 ||
        a.position.x >= geometryProfile.frame.width ||
        a.position.y >= geometryProfile.frame.height)
    )
      report.errors.push(`anchor ${a.id}: outside P04 frame`);
    if (
      a.surfaceOrientation &&
      (!Number.isFinite(a.surfaceOrientation.x) ||
        !Number.isFinite(a.surfaceOrientation.y) ||
        Math.hypot(a.surfaceOrientation.x, a.surfaceOrientation.y) === 0)
    )
      report.errors.push(`anchor ${a.id}: invalid surface orientation`);
    if (a.provenance) checkReference(a.provenance, resolver, report.errors);
    if ((a.review.status === "approved") !== (a.review.reviewedBy !== null))
      report.errors.push(`anchor ${a.id}: review/reviewer mismatch`);
    if (a.review.status !== "approved")
      report.pending.push(`anchor ${a.id}: review pending`);
  }
}
function validatePairing(pairing: Pairing[], report: GrabReport) {
  if (
    !sameSet(
      pairing.map((p) => p.id),
      contactIds,
    ) ||
    !sameSet(
      pairing.map((p) => p.attackerAnchor),
      ["left_grip_contact", "right_grip_contact"],
    ) ||
    !sameSet(
      pairing.map((p) => p.victimAnchor),
      ["left_upper_torso_contact", "right_upper_torso_contact"],
    )
  )
    report.errors.push(
      "pairing: two independent hand-to-torso contacts required; no grip_center",
    );
  for (const p of pairing)
    if (p.attackerAnchor !== `${p.id}_contact`)
      report.errors.push(`pairing ${p.id}: anatomical hand identity mismatch`);
}
const rules = {
  grab_01: {
    meaning: "reach-attempt",
    phases: ["attempt"],
    active: [],
    torso: "inclined-toward-target",
    arms: "right-reach-left-ready",
    hands: ["relaxed", "open"],
    victim: [
      "preserve-previous-pose",
      "inherit-previous",
      "inherit-previous",
      "no-forced-resource",
    ],
    victimHands: [null, null],
    constraints: [
      "right-open-hand-reaches-with-soft-elbow",
      "left-hand-ready-near-torso",
      "no-confirmed-contact",
      "no-victim-reaction-before-capture",
    ],
    variations: [
      "stance-width",
      "knee-flexion",
      "torso-inclination",
      "reach-height-within-character-anatomy",
    ],
  },
  grab_02: {
    meaning: "bilateral-upper-torso-hold",
    phases: ["capture", "hold", "pre-release"],
    active: contactIds,
    torso: "stable-facing-victim",
    arms: "bilateral-grip-soft-elbows",
    hands: ["grasp", "grasp"],
    victim: [
      "received-standing-or-crouching-with-moderate-recoil",
      "both-feet-no-forced-standing",
      "grounded",
      "constraints-without-new-resource",
    ],
    victimHands: ["relaxed", "relaxed"],
    constraints: [
      "two-independent-upper-torso-contacts",
      "grasp-is-not-fist",
      "clothing-independent",
      "victim-arms-clear-contact-surfaces",
      "no-forced-crossed-arms",
    ],
    variations: [
      "stance-width",
      "knee-flexion",
      "elbow-flexion",
      "torso-inclination",
      "surface-contact-placement-within-region",
    ],
  },
  grab_03: {
    meaning: "immediate-post-release-follow-through",
    phases: ["release", "flight"],
    active: [],
    torso: "forward-upward-follow-through",
    arms: "bilateral-open-extension-soft-elbows",
    hands: ["open", "open"],
    victim: [
      "released-local-disequilibrium",
      "no-ground-contacts-during-flight",
      "simulation-owned-flight",
      "constraints-without-new-resource",
    ],
    victimHands: ["relaxed", "relaxed"],
    constraints: [
      "open-hands-no-active-grip",
      "victim-free-of-hands",
      "victim-trajectory-simulation-only",
      "impact-outside-this-resource",
      "attacker-grounded-left-lead-load",
    ],
    variations: [
      "knee-flexion",
      "torso-inclination",
      "elbow-flexion",
      "follow-through-angle",
    ],
  },
};
export function validateGrabVisualTemplate(
  raw: unknown,
  resolver: ConfigResolver,
): GrabReport {
  const report = freshReport();
  if (!templateShape(raw)) {
    report.errors.push(
      ...(templateShape.errors ?? []).map(
        (e) => `template${e.instancePath}: ${e.message}`,
      ),
    );
    return report;
  }
  const d = raw;
  for (const r of Object.values(d.references))
    checkReference(r, resolver, report.errors);
  const base = resolver.readJson(d.references.baseMovement.path) as
    | {
        references?: Record<string, Reference>;
        templateVersion?: string;
        compatiblePipelineVersion?: string;
      }
    | undefined;
  report.errors.push(...validateBaseMovementTemplate(base, resolver).errors);
  for (const key of ["global", "semantics", "geometry"] as const)
    if (
      !same(
        d.references[key],
        base?.references?.[key] && {
          path: base.references[key].path,
          sha256: base.references[key].sha256,
        },
      )
    )
      report.errors.push(`reference ${key}: must agree with P08/P05`);
  if (
    base?.templateVersion !== d.referenceVersions.baseMovementTemplate ||
    base?.compatiblePipelineVersion !== d.compatiblePipelineVersion
  )
    report.errors.push("incompatible P08 version");
  if (
    d.references.poseMaster.path !==
      "docs/characters/pose-master-contract.ts" ||
    d.references.handGestures.path !==
      "docs/characters/schemas/interaction-hand-gestures.schema.json"
  )
    report.errors.push("wrong P03/gesture contract reference");
  if (!same(resolver.readJson(d.references.handGestures.path), gestureSchema))
    report.errors.push("incompatible gesture schema");
  const legacy = resolver.readJson(d.references.legacyGrab.path) as
    | {
        schemaVersion?: number;
        characterId?: string;
        geometryProfileId?: string;
      }
    | undefined;
  if (
    legacy?.schemaVersion !== 1 ||
    legacy.characterId !== "laura" ||
    legacy.geometryProfileId !== geometryProfile.id
  )
    report.errors.push("incompatible P07 evidence");
  if (
    !sameSet(
      d.poses.map((p) => p.resourceId),
      ids,
    )
  )
    report.errors.push("exactly three distinct grab IDs required");
  const expectedSurfaces = Object.values(expectedAnchors).map((a) => a.surface);
  if (
    !sameSet(
      d.surfaces.map((s) => s.id),
      expectedSurfaces,
    )
  )
    report.errors.push("unknown/duplicate/missing body surface");
  for (const s of d.surfaces) {
    const a = Object.values(expectedAnchors).find((v) => v.surface === s.id);
    if (
      !a ||
      a.owner !== s.owner ||
      a.side !== s.laterality ||
      s.region !==
        (s.owner === "attacker"
          ? "palm-and-finger-contact-surface"
          : "anterolateral-upper-torso")
    )
      report.errors.push(`surface ${s.id}: owner/laterality/region mismatch`);
  }
  validateAnchors(d.anchors, resolver, report, true);
  validatePairing(d.pairingCandidate.contacts, report);
  for (const p of d.poses) {
    const r = rules[p.resourceId as keyof typeof rules];
    const fail = (s: string) => report.errors.push(`${p.resourceId}: ${s}`);
    if (
      !same([p.meaning, p.conceptualPhases], [r.meaning, r.phases]) ||
      !sameSet(p.activeContacts, r.active)
    )
      fail("phase/active contacts contradict meaning");
    if (!same([p.attacker.torso, p.attacker.arms], [r.torso, r.arms]))
      fail("attacker posture contradicts phase");
    if (!same([p.attacker.hands.left, p.attacker.hands.right], r.hands))
      fail("hand gestures contradict phase; grasp is not fist");
    if (
      !same(
        [
          p.victim.posture,
          p.victim.supportPolicy,
          p.victim.airbornePolicy,
          p.victim.resourcePolicy,
        ],
        r.victim,
      ) ||
      !same([p.victim.hands.left, p.victim.hands.right], r.victimHands)
    )
      fail("victim restrictions contradict phase");
    if (
      !sameSet(p.structuralConstraints, r.constraints) ||
      !sameSet(p.allowedVariations, r.variations)
    )
      fail("structural constraints/variations changed");
    const expectedGround = [
      "left_foot:sole:true",
      `right_foot:${p.resourceId === "grab_03" ? "forefoot" : "sole"}:true`,
    ];
    if (
      p.attacker.airborne ||
      p.attacker.supportLeg !== "both" ||
      !sameSet(
        p.attacker.groundContacts.map(
          (c) => `${c.site}:${c.surface}:${c.supportsWeight}`,
        ),
        expectedGround,
      )
    )
      fail("attacker ground support mismatch");
    const draft = createUnmeasuredPoseDraft(p.resourceId);
    draft.attributes.lateralityConfirmed = true;
    draft.attributes.supportLeg = p.attacker
      .supportLeg as PoseMasterDraft["attributes"]["supportLeg"];
    draft.attributes.airborne = p.attacker.airborne;
    // P03 validates support topology with unmeasured hands. Grasp is validated
    // above in the explicit extension; it is never written into the P03 enum.
    draft.groundContacts = p.attacker.groundContacts.map((c) => ({
      site: c.site as NonNullable<
        PoseMasterDraft["groundContacts"]
      >[number]["site"],
      position: null,
      supportsWeight: c.supportsWeight,
    }));
    report.errors.push(
      ...validatePoseMasterDraft(draft, ids).map(
        (e) => `${p.resourceId}: ${e}`,
      ),
    );
    for (const role of roles) {
      const required =
        role === "victim" && p.resourceId === "grab_01"
          ? [
              "neck",
              "sternum",
              "pelvis_center",
              "left_shoulder",
              "right_shoulder",
            ]
          : [...landmarkNames];
      if (!sameSet(p.criticalLandmarks[role], required))
        fail(`invalid critical landmarks for ${role}`);
    }
    const requiredAnchors =
      p.resourceId === "grab_01"
        ? [
            "right_grip_contact",
            "left_upper_torso_contact",
            "right_upper_torso_contact",
          ]
        : Object.keys(expectedAnchors);
    if (!sameSet(p.criticalAnchors, requiredAnchors))
      fail("invalid critical anchors");
  }
  report.pending.push(
    "Character/pair coordinates, hand–torso tolerance and feasible separation require evidence.",
    "Camera/projection and dual mannequin outputs remain pending; no images generated.",
  );
  return report;
}

export function projectInteractionAnchor(
  anchor: InteractionAnchor,
  actor: GrabComposition["actors"][InteractionRole],
) {
  if (!anchor.position || !actor.root || actor.facing === null) return null;
  const point = actorLocalToWorld(
    canonicalToActorLocal(anchor.position),
    actor.root,
    actor.facing,
  );
  const orientation = anchor.surfaceOrientation
    ? {
        x: actor.facing * anchor.surfaceOrientation.x,
        y: -anchor.surfaceOrientation.y,
      }
    : null;
  return {
    owner: anchor.owner,
    id: anchor.id,
    laterality: anchor.laterality,
    point,
    orientation,
  };
}
export function diagnoseGrabComposition(c: GrabComposition) {
  const a = c.actors.attacker.root,
    v = c.actors.victim.root;
  return {
    observedRootDistanceGameUnits:
      a && v ? Math.hypot(a.x - v.x, a.y - v.y) : null,
    contacts: c.pairing.map((pair) => {
      const aa = c.anchors.find((x) => x.id === pair.attackerAnchor);
      const va = c.anchors.find((x) => x.id === pair.victimAnchor);
      const aw = aa ? projectInteractionAnchor(aa, c.actors.attacker) : null;
      const vw = va ? projectInteractionAnchor(va, c.actors.victim) : null;
      const error =
        aw && vw
          ? { x: aw.point.x - vw.point.x, y: aw.point.y - vw.point.y }
          : null;
      return {
        id: pair.id,
        active: c.activeContacts.includes(pair.id),
        attacker: aw,
        victim: vw,
        errorGameUnits: error,
        errorCanonicalPixels: error
          ? Math.hypot(error.x, error.y) /
            geometryProfile.gameUnitsPerCanonicalPixel
          : null,
      };
    }),
  };
}
function validateOcclusion(c: GrabComposition, report: GrabReport) {
  const graph = new Map<string, string[]>();
  const directions = new Set<string>();
  for (const { front, back } of c.occlusion.relations) {
    const a = `${front.owner}.${front.part}`,
      b = `${back.owner}.${back.part}`;
    if (a === b || graph.get(a)?.includes(b))
      report.errors.push("occlusion: self/duplicate relation");
    graph.set(a, [...(graph.get(a) ?? []), b]);
    if (front.owner !== back.owner) directions.add(front.owner);
  }
  const done = new Set<string>(),
    visiting = new Set<string>();
  const cycle = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (done.has(node)) return false;
    visiting.add(node);
    if ((graph.get(node) ?? []).some(cycle)) return true;
    visiting.delete(node);
    done.add(node);
    return false;
  };
  if ([...graph.keys()].some(cycle))
    report.errors.push("occlusion: cyclic part ordering");
  if (directions.size === 2 && c.occlusion.requiresLayering !== true)
    report.errors.push(
      "occlusion: interleaved actors require requiresLayering=true",
    );
  if (
    c.occlusion.status === "reviewed" &&
    (c.occlusion.requiresLayering === null || !c.occlusion.evidence)
  )
    report.errors.push(
      "occlusion: reviewed state needs evidence and layering decision",
    );
  if (c.occlusion.requiresLayering)
    report.pending.push(
      "requiresLayering: implementation belongs to later integration, not P09",
    );
}
export function validateGrabComposition(
  raw: unknown,
  resolver: ConfigResolver,
): GrabReport {
  const report = freshReport();
  if (!compositionShape(raw)) {
    report.errors.push(
      ...(compositionShape.errors ?? []).map(
        (e) => `composition${e.instancePath}: ${e.message}`,
      ),
    );
    return report;
  }
  const c = raw;
  const template = checkReference(c.template, resolver, report.errors);
  const tr = validateGrabVisualTemplate(template, resolver);
  report.errors.push(...tr.errors);
  if (tr.errors.length) return report;
  // Template's pending anchor coordinates are normal; instance readiness is
  // evaluated separately, never inherited as a production approval.
  const r = rules[c.resourceId as keyof typeof rules];
  if (!sameSet(c.activeContacts, r.active))
    report.errors.push("composition: active links contradict resource phase");
  if (c.mechanicalPhase !== null && !r.phases.includes(c.mechanicalPhase))
    report.incompatibilities.push(
      "visual resource incompatible with observed mechanical phase; do not fix simulation",
    );
  if (c.actors.attacker.actorId === c.actors.victim.actorId)
    report.errors.push(
      "roles require distinct physical actors (same character is allowed)",
    );
  for (const role of roles) {
    const actor = c.actors[role];
    if (actor.movementInstance) {
      const doc = checkReference(
        actor.movementInstance,
        resolver,
        report.errors,
      );
      const validation = validateMovementTemplateInstance(doc, resolver);
      report.errors.push(...validation.errors.map((e) => `${role}: ${e}`));
      if (validation.pending.length)
        report.pending.push(`${role}: character authoring inputs incomplete`);
    } else report.pending.push(`${role}: P08 character instance pending`);
    if (!actor.root || actor.facing === null || actor.receivedStance === null)
      report.pending.push(`${role}: mechanical observation incomplete`);
  }
  if (c.actors.attacker.receivedStance === "crouching")
    report.incompatibilities.push(
      "attacker template requires standing initiation/support articulation",
    );
  validateAnchors(c.anchors, resolver, report, false);
  validatePairing(c.pairing, report);
  validateOcclusion(c, report);
  const pr = c.pairingReview;
  if (
    (pr.status === "approved") !== (pr.reviewedBy !== null) ||
    (pr.status === "approved" && !pr.evidence)
  )
    report.errors.push("pairing review requires evidence and reviewer");
  if (pr.status === "pending")
    report.pending.push(
      "pairing requires dual mannequin review; never force crossed arms",
    );
  for (const evidence of [
    pr.evidence,
    c.occlusion.evidence,
    c.feasibility.evidence,
  ])
    if (evidence) checkReference(evidence, resolver, report.errors);
  const f = c.feasibility,
    range = f.rootDistanceRangeGameUnits;
  if (range && range.min > range.max)
    report.errors.push("feasible range is reversed");
  if (
    (range ||
      f.contactToleranceCanonicalPixels !== null ||
      f.status !== "pending") &&
    !f.evidence
  )
    report.errors.push(
      "feasibility values/status require evidence, never universal invented defaults",
    );
  if (f.status === "incompatible" && !f.reasons.length)
    report.errors.push("incompatibility requires explicit reasons");
  if (f.status !== "incompatible" && f.reasons.length)
    report.errors.push("incompatible reasons contradict feasibility status");
  report.incompatibilities.push(...f.reasons);
  const diagnostic = diagnoseGrabComposition(c);
  if (
    range &&
    diagnostic.observedRootDistanceGameUnits !== null &&
    (diagnostic.observedRootDistanceGameUnits < range.min ||
      diagnostic.observedRootDistanceGameUnits > range.max)
  )
    report.incompatibilities.push(
      "observed roots outside evidenced feasible visual range",
    );
  if (f.contactToleranceCanonicalPixels !== null)
    for (const contact of diagnostic.contacts)
      if (
        contact.active &&
        contact.errorCanonicalPixels !== null &&
        contact.errorCanonicalPixels > f.contactToleranceCanonicalPixels
      )
        report.incompatibilities.push(
          `${contact.id}: anchor error exceeds evidenced tolerance; no root correction permitted`,
        );
  if (c.occlusion.status === "pending")
    report.pending.push("occlusion review pending");
  if (f.status === "pending")
    report.pending.push(
      "anatomy/articulation/surfaces/facing feasibility pending",
    );
  if (f.status === "compatible") {
    if (
      !range ||
      f.contactToleranceCanonicalPixels === null ||
      c.mechanicalPhase === null ||
      pr.status !== "approved" ||
      c.occlusion.status !== "reviewed" ||
      c.anchors.some(
        (a) =>
          !a.position ||
          !a.surfaceOrientation ||
          a.review.status !== "approved",
      ) ||
      report.pending.length ||
      report.incompatibilities.length
    )
      report.errors.push(
        "compatible claim requires complete reviewed pair evidence and no incompatibilities",
      );
  }
  return report;
}
