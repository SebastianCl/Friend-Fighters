import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import template from "../docs/characters/grab-visual-template.json";
import {
  validateGrabVisualTemplate,
  validateGrabComposition,
  diagnoseGrabComposition,
  projectInteractionAnchor,
  type GrabVisualTemplate,
  type GrabComposition,
} from "../docs/characters/grab-visual-contract";
import {
  createUnmeasuredPoseDraft,
  validatePoseMasterDraft,
} from "../docs/characters/pose-master-contract";
import type { ConfigResolver } from "../docs/characters/config-contract";

const evidencePath = "tests/synthetic-only-grab-evidence.json";
const evidence = { path: evidencePath, sha256: "a".repeat(64) };
const resolver: ConfigResolver = {
  readJson(path) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return undefined;
    }
  },
  sha256(path) {
    if (path === evidencePath) return evidence.sha256;
    try {
      return createHash("sha256").update(readFileSync(path)).digest("hex");
    } catch {
      return null;
    }
  },
};
function fixture(): GrabComposition {
  return {
    schemaVersion: 1,
    compositionVersion: "1.0.0",
    status: "draft",
    template: {
      path: "docs/characters/grab-visual-template.json",
      sha256: resolver.sha256("docs/characters/grab-visual-template.json")!,
    },
    geometryProfileId: "canonical-320x352-v1",
    resourceId: "grab_02",
    actors: {
      attacker: {
        actorId: "fixture-a",
        movementInstance: null,
        root: null,
        facing: null,
        receivedStance: null,
      },
      victim: {
        actorId: "fixture-v",
        movementInstance: null,
        root: null,
        facing: null,
        receivedStance: null,
      },
    },
    anchors: structuredClone(template.anchors) as GrabComposition["anchors"],
    pairing: structuredClone(template.pairingCandidate.contacts),
    pairingReview: { status: "pending", evidence: null, reviewedBy: null },
    activeContacts: ["right_grip", "left_grip"],
    mechanicalPhase: null,
    globalVisualOffsets: "forbidden",
    occlusion: {
      status: "pending",
      relations: [],
      requiresLayering: null,
      evidence: null,
    },
    feasibility: {
      status: "pending",
      derivation: "anatomy-articulation-surfaces-facing",
      rootDistanceRangeGameUnits: null,
      contactToleranceCanonicalPixels: null,
      evidence: null,
      reasons: [],
    },
  };
}
// Every numeric value below is a synthetic test fixture. No character is measured,
// no real anatomy/tolerance is asserted, and no fixture is published as an asset.
function geometryFixture(): GrabComposition {
  const c = fixture();
  c.actors.attacker.root = { x: 0, y: 0 };
  c.actors.attacker.facing = 1;
  c.actors.attacker.receivedStance = "standing";
  c.actors.victim.root = { x: 90, y: 0 };
  c.actors.victim.facing = -1;
  c.actors.victim.receivedStance = "crouching";
  for (const a of c.anchors) {
    a.position = { x: 220, y: 200 };
    a.surfaceOrientation = { x: 1, y: 0 };
    a.measurementStatus = "authored";
    a.provenance = evidence;
    a.review = { status: "approved", reviewedBy: "synthetic-reviewer" };
  }
  return c;
}

describe("P09 global visual template", () => {
  it("validates approved references, exactly three IDs and pending geometry", () => {
    const r = validateGrabVisualTemplate(template, resolver);
    expect(r.errors).toEqual([]);
    expect(r.productionReady).toBe(false);
    expect(r.pending.length).toBeGreaterThan(0);
    expect(template.poses.map((p) => p.resourceId)).toEqual([
      "grab_01",
      "grab_02",
      "grab_03",
    ]);
  });
  const invalid: [string, (d: GrabVisualTemplate) => void, string][] = [
    [
      "duplicate ID",
      (d) => {
        d.poses[1] = structuredClone(d.poses[0]);
      },
      "distinct grab IDs",
    ],
    [
      "missing resource",
      (d) => {
        d.poses.pop();
      },
      "3",
    ],
    [
      "new victim resource",
      (d) => {
        d.poses[1].resourceId = "victim_01";
      },
      "allowed values",
    ],
    [
      "missing roles",
      (d) => {
        Reflect.deleteProperty(d, "roles");
      },
      "required",
    ],
    [
      "screen roles",
      (d) => {
        Object.assign(d.roles, { "screen-left": d.roles.attacker });
      },
      "constant",
    ],
    [
      "reach active contact",
      (d) => {
        d.poses[0].activeContacts = ["right_grip"];
      },
      "active contacts",
    ],
    [
      "hold one contact",
      (d) => {
        d.poses[1].activeContacts = ["right_grip"];
      },
      "active contacts",
    ],
    [
      "hold duplicate contact",
      (d) => {
        d.poses[1].activeContacts = ["right_grip", "right_grip"];
      },
      "active contacts",
    ],
    [
      "throw active contact",
      (d) => {
        d.poses[2].activeContacts = ["left_grip"];
      },
      "active contacts",
    ],
    [
      "throw before release",
      (d) => {
        d.poses[2].conceptualPhases = ["pre-release"];
      },
      "phase",
    ],
    [
      "grasp coded as fist",
      (d) => {
        d.poses[1].attacker.hands.left = "fist";
      },
      "grasp is not fist",
    ],
    [
      "closed throw hand",
      (d) => {
        d.poses[2].attacker.hands.right = "grasp";
      },
      "hand gestures",
    ],
    [
      "premature victim pose",
      (d) => {
        d.poses[0].victim.posture = "hurt";
      },
      "victim restrictions",
    ],
    [
      "victim forced standing",
      (d) => {
        d.poses[1].victim.supportPolicy = "standing-only";
      },
      "victim restrictions",
    ],
    [
      "attacker airborne",
      (d) => {
        d.poses[2].attacker.airborne = true;
      },
      "ground support",
    ],
    [
      "invalid anchor owner",
      (d) => {
        d.anchors[0].owner = "victim";
      },
      "owner/laterality",
    ],
    [
      "invalid anatomical side",
      (d) => {
        d.anchors[0].laterality = "right";
      },
      "owner/laterality",
    ],
    [
      "wrong surface",
      (d) => {
        d.anchors[0].surfaceId = "sternum";
      },
      "surface mismatch",
    ],
    [
      "body surface treated as landmark",
      (d) => {
        d.surfaces[2].region = "sternum";
      },
      "allowed values",
    ],
    [
      "clothing dependence",
      (d) => {
        d.surfaces[2].clothingDependent = true;
      },
      "constant",
    ],
    [
      "unknown surface",
      (d) => {
        d.surfaces[0].id = "hair";
      },
      "body surface",
    ],
    [
      "duplicate anchor",
      (d) => {
        d.anchors[1] = structuredClone(d.anchors[0]);
      },
      "distinct anatomical anchors",
    ],
    [
      "pending plus approved",
      (d) => {
        d.anchors[0].review.status = "approved";
      },
      "pending contradicts",
    ],
    [
      "global measured point",
      (d) => {
        d.anchors[0].position = { x: 160, y: 200 };
        d.anchors[0].measurementStatus = "authored";
        d.anchors[0].provenance = evidence;
      },
      "global template cannot",
    ],
    [
      "grip center replacement",
      (d) => {
        d.pairingCandidate.contacts[0].attackerAnchor = "grip_center";
      },
      "two independent",
    ],
    [
      "both hands same surface",
      (d) => {
        d.pairingCandidate.contacts[1].victimAnchor =
          d.pairingCandidate.contacts[0].victimAnchor;
      },
      "two independent",
    ],
    [
      "shared physical root",
      (d) => {
        d.policies.rootPolicy = "shared-root";
      },
      "constant",
    ],
    [
      "hidden offset",
      (d) => {
        d.policies.globalVisualOffsets = "allowed";
      },
      "constant",
    ],
    [
      "universal separation",
      (d) => {
        d.policies.universalArtisticSeparation = 100 as never;
      },
      "constant",
    ],
    [
      "invented contact tolerance",
      (d) => {
        d.policies.handTorsoTolerance = 1 as never;
      },
      "constant",
    ],
    [
      "mirror swaps anatomical IDs",
      (d) => {
        d.laterality.mirror = "swap-left-right";
      },
      "constant",
    ],
    [
      "incompatible version",
      (d) => {
        d.templateVersion = "2.0.0";
      },
      "constant",
    ],
    [
      "P03 changed hash",
      (d) => {
        d.references.poseMaster.sha256 = "0".repeat(64);
      },
      "broken/changed reference",
    ],
    [
      "broken P08",
      (d) => {
        d.references.baseMovement.path = "missing.json";
      },
      "reference",
    ],
    [
      "wrong P04",
      (d) => {
        d.references.geometry = d.references.semantics;
      },
      "must agree",
    ],
    [
      "unknown gesture version",
      (d) => {
        d.poses[1].attacker.hands.contractVersion = "2.0.0";
      },
      "constant",
    ],
    [
      "unknown landmark",
      (d) => {
        d.poses[0].criticalLandmarks.attacker[0] = "bodyRoot";
      },
      "critical landmarks",
    ],
    [
      "unsafe variation",
      (d) => {
        d.poses[1].allowedVariations.push("stretch-arms");
      },
      "constraints/variations",
    ],
  ];
  it.each(invalid)("rejects %s", (_name, mutate, expected) => {
    const d = structuredClone(template) as GrabVisualTemplate;
    mutate(d);
    expect(validateGrabVisualTemplate(d, resolver).errors.join("\n")).toContain(
      expected,
    );
  });
  it("keeps P03 hands closed to grasp while P09 accepts it", () => {
    const d = createUnmeasuredPoseDraft("grab_02");
    d.attributes.hands.right = "grasp" as never;
    expect(validatePoseMasterDraft(d, ["grab_02"])).toContain(
      "invalid hand state: right",
    );
    expect(validateGrabVisualTemplate(template, resolver).errors).toEqual([]);
  });
  it("supports an explicit alternative pairing without inventing crossed-arm geometry", () => {
    const d = structuredClone(template);
    [
      d.pairingCandidate.contacts[0].victimAnchor,
      d.pairingCandidate.contacts[1].victimAnchor,
    ] = [
      d.pairingCandidate.contacts[1].victimAnchor,
      d.pairingCandidate.contacts[0].victimAnchor,
    ];
    expect(validateGrabVisualTemplate(d, resolver).errors).toEqual([]);
    expect(d.pairingCandidate.status).toBe(
      "candidate-needs-dual-mannequin-review",
    );
  });
});

describe("P09 draft composition and geometry", () => {
  it("accepts a fully unmeasured draft without claiming compatibility or production", () => {
    const r = validateGrabComposition(fixture(), resolver);
    expect(r.errors).toEqual([]);
    expect(r.incompatibilities).toEqual([]);
    expect(r.productionReady).toBe(false);
  });
  const invalid: [string, (d: GrabComposition) => void, string][] = [
    [
      "shared actor identity",
      (d) => {
        d.actors.victim.actorId = d.actors.attacker.actorId;
      },
      "distinct physical actors",
    ],
    [
      "invalid facing",
      (d) => {
        d.actors.attacker.facing = 0 as never;
      },
      "allowed values",
    ],
    [
      "new resource",
      (d) => {
        d.resourceId = "grab_04";
      },
      "allowed values",
    ],
    [
      "old profile",
      (d) => {
        d.geometryProfileId = "legacy";
      },
      "constant",
    ],
    [
      "one active hold link",
      (d) => {
        d.activeContacts.pop();
      },
      "active links",
    ],
    [
      "reach holding",
      (d) => {
        d.resourceId = "grab_01";
      },
      "active links",
    ],
    [
      "released holding",
      (d) => {
        d.resourceId = "grab_03";
      },
      "active links",
    ],
    [
      "pending coordinates",
      (d) => {
        d.anchors[0].position = { x: 20, y: 20 };
      },
      "pending contradicts",
    ],
    [
      "outside frame",
      (d) => {
        d.anchors[0].position = { x: 320, y: 20 };
      },
      "outside P04",
    ],
    [
      "measured without source",
      (d) => {
        d.anchors[0].measurementStatus = "measured";
      },
      "position and provenance",
    ],
    [
      "unknown laterality",
      (d) => {
        d.anchors[0].laterality = "screen-left" as never;
      },
      "allowed values",
    ],
    [
      "zero orientation",
      (d) => {
        d.anchors[0].surfaceOrientation = { x: 0, y: 0 };
      },
      "invalid surface orientation",
    ],
    [
      "unsupported offset",
      (d) => {
        Object.assign(d.actors.attacker, { visualOffset: { x: 2, y: 0 } });
      },
      "additional properties",
    ],
    [
      "silent scale",
      (d) => {
        Object.assign(d.actors.victim, { scale: 0.8 });
      },
      "additional properties",
    ],
    [
      "unreviewed pairing approval",
      (d) => {
        d.pairingReview.status = "approved";
      },
      "review requires",
    ],
    [
      "unreviewed occlusion",
      (d) => {
        d.occlusion.status = "reviewed";
      },
      "reviewed state",
    ],
    [
      "range without evidence",
      (d) => {
        d.feasibility.rootDistanceRangeGameUnits = { min: 80, max: 100 };
      },
      "require evidence",
    ],
    [
      "reversed range",
      (d) => {
        d.feasibility.rootDistanceRangeGameUnits = { min: 100, max: 80 };
        d.feasibility.evidence = evidence;
      },
      "range is reversed",
    ],
    [
      "incompatible without reason",
      (d) => {
        d.feasibility.status = "incompatible";
        d.feasibility.evidence = evidence;
      },
      "explicit reasons",
    ],
    [
      "premature compatible status",
      (d) => {
        d.feasibility.status = "compatible";
        d.feasibility.evidence = evidence;
      },
      "compatible claim requires",
    ],
    [
      "broken character instance",
      (d) => {
        d.actors.attacker.movementInstance = {
          path: "missing.json",
          sha256: "a".repeat(64),
        };
      },
      "broken/changed reference",
    ],
    [
      "production approval",
      (d) => {
        d.status = "production-ready" as never;
      },
      "constant",
    ],
  ];
  it.each(invalid)("rejects %s", (_name, mutate, expected) => {
    const d = fixture();
    mutate(d);
    expect(validateGrabComposition(d, resolver).errors.join("\n")).toContain(
      expected,
    );
  });
  it("diagnoses the legacy pre-release throw without rewriting state", () => {
    const c = fixture();
    c.resourceId = "grab_03";
    c.activeContacts = [];
    c.mechanicalPhase = "pre-release";
    const before = JSON.stringify(c);
    const r = validateGrabComposition(c, resolver);
    expect(r.errors).toEqual([]);
    expect(r.incompatibilities.join()).toContain("mechanical phase");
    expect(JSON.stringify(c)).toBe(before);
  });
  it("reports each anchor error separately and never emits root corrections", () => {
    const c = geometryFixture();
    const before = JSON.stringify(c);
    let d = diagnoseGrabComposition(c);
    expect(d.observedRootDistanceGameUnits).toBe(90);
    expect(d.contacts.every((x) => x.errorCanonicalPixels === 0)).toBe(true);
    expect(JSON.stringify(c)).toBe(before);
    c.anchors.find((a) => a.id === "left_grip_contact")!.position!.x += 10;
    c.anchors.find((a) => a.id === "right_grip_contact")!.position!.x -= 10;
    d = diagnoseGrabComposition(c);
    expect(d.contacts.map((x) => x.errorCanonicalPixels)).toEqual([10, 10]);
    expect(Object.keys(d)).toEqual([
      "observedRootDistanceGameUnits",
      "contacts",
    ]);
  });
  it("mirrors both actors coherently and reversibly while preserving roles and anatomical IDs", () => {
    const c = geometryFixture();
    c.actors.attacker.root = { x: 12, y: 5 };
    c.actors.victim.root = { x: 102, y: 5 };
    const project = () =>
      c.anchors.map((a) => projectInteractionAnchor(a, c.actors[a.owner])!);
    const before = project();
    const rootBefore = structuredClone(c.actors);
    // Preview reflection about world X=50; not a command to a live actor.
    const reflect = () => {
      for (const actor of Object.values(c.actors)) {
        actor.root!.x = 100 - actor.root!.x;
        actor.facing = actor.facing === 1 ? -1 : 1;
      }
    };
    reflect();
    const after = project();
    for (let i = 0; i < before.length; i++) {
      expect(after[i].id).toBe(before[i].id);
      expect(after[i].owner).toBe(before[i].owner);
      expect(after[i].laterality).toBe(before[i].laterality);
      expect(after[i].point.x).toBeCloseTo(100 - before[i].point.x, 8);
      expect(after[i].point.y).toBe(before[i].point.y);
      expect(after[i].orientation!.x).toBe(-before[i].orientation!.x);
    }
    reflect();
    expect(c.actors).toEqual(rootBefore);
    expect(project()).toEqual(before);
  });
  it("detects interleaved parts and cyclic occlusion; can declare future layering", () => {
    const c = fixture();
    c.occlusion.relations = [
      {
        front: { owner: "attacker", part: "right_hand" },
        back: { owner: "victim", part: "torso" },
      },
      {
        front: { owner: "victim", part: "left_arm" },
        back: { owner: "attacker", part: "torso" },
      },
    ];
    expect(validateGrabComposition(c, resolver).errors.join()).toContain(
      "requiresLayering=true",
    );
    c.occlusion.requiresLayering = true;
    expect(validateGrabComposition(c, resolver).errors).toEqual([]);
    c.occlusion.relations.push({
      front: { owner: "victim", part: "torso" },
      back: { owner: "attacker", part: "right_hand" },
    });
    expect(validateGrabComposition(c, resolver).errors.join()).toContain(
      "cyclic",
    );
  });
  it("reports evidenced geometric incompatibility without scaling or repositioning", () => {
    const c = geometryFixture();
    c.feasibility.rootDistanceRangeGameUnits = { min: 95, max: 110 };
    c.feasibility.contactToleranceCanonicalPixels = 1;
    c.feasibility.evidence = evidence;
    c.anchors[0].position!.x += 10;
    const before = JSON.stringify(c);
    const r = validateGrabComposition(c, resolver);
    expect(r.errors).toEqual([]);
    expect(r.incompatibilities.join()).toContain("outside evidenced");
    expect(r.incompatibilities.join()).toContain("anchor error");
    expect(JSON.stringify(c)).toBe(before);
  });
  it("records explicit incompatibility as a valid draft diagnosis", () => {
    const c = fixture();
    c.feasibility = {
      ...c.feasibility,
      status: "incompatible",
      evidence,
      reasons: ["synthetic arms cannot reach at observed roots"],
    };
    const r = validateGrabComposition(c, resolver);
    expect(r.errors).toEqual([]);
    expect(r.incompatibilities).toEqual(c.feasibility.reasons);
  });
  it("CLI validation preserves all tracked P01–P08, engine-map, runtime and production files", () => {
    const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(
        (p) =>
          p &&
          (p.startsWith("src/") ||
            p.startsWith("public/") ||
            p.startsWith("docs/characters/")) &&
          !p.includes("grab-visual") &&
          !p.includes("grab-composition") &&
          !p.includes("interaction-hand-gestures") &&
          !p.includes("validate-grab-template"),
      );
    const hashes = () => files.map((p) => resolver.sha256(p));
    const before = hashes();
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        ["docs/characters/validate-grab-template.mjs"],
        { encoding: "utf8" },
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.productionReady).toBe(false);
    expect(hashes()).toEqual(before);
  });
});
