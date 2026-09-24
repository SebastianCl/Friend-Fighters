import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import template from "../docs/characters/base-movement-template.json";
import semantics from "../docs/characters/pose-semantics.json";
import geometry from "../docs/characters/geometry-profile.json";
import {
  validateBaseMovementTemplate,
  validateMovementTemplateInstance,
  type BaseMovementTemplate,
  type MovementTemplateInstance,
} from "../docs/characters/base-movement-contract";
import type { ConfigResolver } from "../docs/characters/config-contract";

const resolver: ConfigResolver = {
  readJson(path) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return undefined;
    }
  },
  sha256(path) {
    try {
      return createHash("sha256").update(readFileSync(path)).digest("hex");
    } catch {
      return null;
    }
  },
};
const ref = (path: string) => ({
  path,
  schemaVersion: 1,
  sha256: resolver.sha256(path)!,
});
function fixture() {
  // An in-memory schema fixture referencing the real, unchanged P07 draft.
  // This is never persisted as Laura's authoring instance; no anatomy is invented.
  return {
    schemaVersion: 1,
    instanceVersion: "1.0.0",
    status: "draft",
    characterId: "laura",
    characterSpec: ref("docs/characters/laura/character-spec.json"),
    template: {
      ...ref("docs/characters/base-movement-template.json"),
      templateVersion: "1.0.0",
    },
    lateralVariant: {
      declaration: "default",
      lead: "left",
      executor: "right",
      facingMirror: "preserve-anatomical-ids",
    },
    neutralPelvisReference: {
      status: "pending",
      coordinateSpace: "canonical-frame-pixels",
      position: null,
      evidence: null,
    },
  } satisfies MovementTemplateInstance as MovementTemplateInstance;
}

describe("P08 Base Movement Template", () => {
  it("validates exactly 24 definitions against real P03/P04/P05 references without approving assets", () => {
    const report = validateBaseMovementTemplate(template, resolver);
    expect(report.errors).toEqual([]);
    expect(report.productionReady).toBe(false);
    expect(report.pending.length).toBeGreaterThan(0);
    expect(template.poses.map((p) => p.resourceId)).toEqual(
      semantics.poses.map((p) => p.resourceId),
    );
    expect(
      semantics.poses.filter((p) => p.reserve).map((p) => p.resourceId),
    ).toEqual(["base_03", "base_06", "base_09", "base_12"]);
    expect(
      template.poses.every((p) => !("engineKey" in p) && !("label" in p)),
    ).toBe(true);
  });

  const invalid: [string, (doc: BaseMovementTemplate) => void, string][] = [
    [
      "duplicate/missing resource",
      (d) => {
        d.poses[1] = structuredClone(d.poses[0]);
      },
      "duplicate resource",
    ],
    [
      "missing pose",
      (d) => {
        d.poses.pop();
      },
      "24",
    ],
    [
      "unknown/grab resource",
      (d) => {
        d.poses[0].resourceId = "grab_01";
      },
      "pattern",
    ],
    [
      "incompatible version",
      (d) => {
        d.templateVersion = "2.0.0";
      },
      "constant",
    ],
    [
      "source of truth mismatch",
      (d) => {
        d.references.semantics.sha256 = "0".repeat(64);
      },
      "reference hash changed",
    ],
    [
      "broken reference",
      (d) => {
        d.references.geometry.path = "missing.json";
      },
      "broken",
    ],
    [
      "reinterpretation of P03",
      (d) => {
        d.poses[21].intent = "standing-straight-punch";
      },
      "P03 identity",
    ],
    [
      "guards lose distinction",
      (d) => {
        d.poses[1].structure.arms = "guard";
      },
      "P03 identity",
    ],
    [
      "15 becomes attack anticipation",
      (d) => {
        d.poses[14].structure.torso = "punch-rotation";
      },
      "posture",
    ],
    [
      "07 becomes knee attack",
      (d) => {
        d.poses[6].structure.legs = "right-knee-drive";
      },
      "P03 identity",
    ],
    [
      "wrong executor side",
      (d) => {
        d.poses[21].structure.executor = "none";
      },
      "executor",
    ],
    [
      "hands contradict palm push",
      (d) => {
        d.poses[20].structure.hands.left = "fist";
      },
      "hands",
    ],
    [
      "relaxed attack guard",
      (d) => {
        d.poses[22].structure.hands.right = "relaxed";
      },
      "hands",
    ],
    [
      "crouch becomes kneeling",
      (d) => {
        d.poses[7].structure.contacts[0].site = "left_knee";
      },
      "support surfaces",
    ],
    [
      "jump touches ground",
      (d) => {
        d.poses[6].structure.contacts.push({
          site: "left_foot",
          surface: "sole",
          supportsWeight: true,
        });
      },
      "airborne requires",
    ],
    [
      "aerial declared grounded",
      (d) => {
        d.poses[21].structure.airborne = false;
      },
      "airborne contradicts",
    ],
    [
      "wrong stance support",
      (d) => {
        d.poses[17].structure.supportLeg = "right";
      },
      "support leg disagrees",
    ],
    [
      "palm not weight-bearing",
      (d) => {
        d.poses[19].structure.contacts[1].supportsWeight = false;
      },
      "constant",
    ],
    [
      "contact surface is joint center",
      (d) => {
        d.poses[13].structure.contacts[0].surface = "head_center";
      },
      "allowed values",
    ],
    [
      "lying foot support",
      (d) => {
        d.poses[13].structure.supportLeg = "both";
      },
      "support leg disagrees",
    ],
    [
      "air pelvis lowered",
      (d) => {
        d.poses[22].structure.pelvisRelation = "lowered-from-neutral";
      },
      "pelvis reference",
    ],
    [
      "unsafe free variation",
      (d) => {
        d.poses[17].allowedVariations[0].parameter = "stride";
      },
      "variation",
    ],
    [
      "missing landmark",
      (d) => {
        d.poses[0].criticalLandmarks.pop();
      },
      "partition",
    ],
    [
      "unknown landmark",
      (d) => {
        d.poses[0].variableLandmarks[0] = "bodyRoot";
      },
      "partition",
    ],
    [
      "essential knee made variable",
      (d) => {
        const p = d.poses[21];
        p.criticalLandmarks = p.criticalLandmarks.filter(
          (n) => n !== "right_knee",
        );
        p.variableLandmarks.push("right_knee");
      },
      "essential landmark",
    ],
    [
      "fourth walk resource invented",
      (d) => {
        d.walk.unstoredTransition.resourceId = "base_25" as never;
      },
      "constant",
    ],
    [
      "walk support reversed",
      (d) => {
        d.walk.unstoredTransition.supportLeg = "left";
      },
      "constant",
    ],
    [
      "mirror swaps anatomy",
      (d) => {
        d.authoringConvention.facingMirror = "swap-left-right";
      },
      "constant",
    ],
    [
      "camera prematurely fixed",
      (d) => {
        d.mannequin.camera.projection = "orthographic" as never;
      },
      "constant",
    ],
    [
      "morphology made universal",
      (d) => {
        d.mannequin.universalMorphology = true;
      },
      "constant",
    ],
    [
      "per-pose scaling",
      (d) => {
        d.anatomyPolicy.perPoseScale = true;
      },
      "constant",
    ],
    [
      "second actor origin",
      (d) => {
        d.rootPolicy.additionalActorTransform = true;
      },
      "constant",
    ],
    [
      "invented coordinates",
      (d) => {
        Object.assign(d.poses[0], {
          landmarks: { pelvis_center: { x: 160, y: 100 } },
        });
      },
      "additional properties",
    ],
  ];
  it.each(invalid)("rejects %s", (_name, mutate, message) => {
    const data = structuredClone(template);
    mutate(data);
    expect(
      validateBaseMovementTemplate(data, resolver).errors.join("\n"),
    ).toContain(message);
  });

  it("preserves the three-frame walk, explicit unstored phase and complementary supports", () => {
    expect(template.walk.sequence.map((s) => [s.resourceId, s.phase])).toEqual([
      ["base_04", "left-contact"],
      ["base_05", "left-passing"],
      ["base_06", "right-contact"],
    ]);
    expect(template.walk.unstoredTransition).toMatchObject({
      resourceId: null,
      phase: "right-passing",
      supportLeg: "right",
      swingLeg: "left",
    });
    expect(
      template.poses.slice(3, 6).map((p) => p.structure.supportLeg),
    ).toEqual(["both", "left", "both"]);
  });
  it("air poses have distinct articulation, the same pelvis policy and no trajectory", () => {
    const poses = [6, 21, 22].map((i) => template.poses[i]);
    expect(poses.map((p) => p.structure.legs)).toEqual([
      "bilateral-tuck",
      "right-knee-drive",
      "right-air-extension",
    ]);
    for (const p of poses)
      expect(p.structure).toMatchObject({
        pelvisRelation: "shared-aerial-reference",
        airborne: true,
        supportLeg: "none",
        contacts: [],
      });
    expect(template.rootPolicy.worldTrajectory).toBe("simulation-only");
  });
  it("a reordered catalog remains valid: identity comes from resourceId, not row order", () => {
    const data = structuredClone(template);
    data.poses.reverse();
    expect(validateBaseMovementTemplate(data, resolver).errors).toEqual([]);
  });
  it("does not mutate input documents during validation", () => {
    const data = structuredClone(template);
    const serialized = JSON.stringify(data);
    validateBaseMovementTemplate(data, resolver);
    expect(JSON.stringify(data)).toBe(serialized);
  });
});

describe("P08 explicit character authoring extension", () => {
  it("accepts an incomplete draft with no anatomy or pelvis measurements", () => {
    const report = validateMovementTemplateInstance(fixture(), resolver);
    expect(report.errors).toEqual([]);
    expect(report.productionReady).toBe(false);
    expect(report.pending).toContain("neutralPelvisReference pending");
  });
  it("accepts an explicitly opposite authoring variant without facing-based ID swaps", () => {
    const instance = fixture();
    instance.lateralVariant = {
      declaration: "opposite",
      lead: "right",
      executor: "left",
      facingMirror: "preserve-anatomical-ids",
    };
    expect(validateMovementTemplateInstance(instance, resolver).errors).toEqual(
      [],
    );
    expect(template.poses[21].structure.executor).toBe("right");
  });
  const invalid: [string, (d: MovementTemplateInstance) => void, string][] = [
    [
      "silent side swap",
      (d) => {
        d.lateralVariant.lead = "right";
        d.lateralVariant.executor = "left";
      },
      "lateral variant",
    ],
    [
      "same lead/executor",
      (d) => {
        d.lateralVariant.executor = "left";
      },
      "lateral variant",
    ],
    [
      "screen laterality",
      (d) => {
        d.lateralVariant.lead = "screen-left" as never;
      },
      "allowed values",
    ],
    [
      "wrong character",
      (d) => {
        d.characterId = "other-character";
      },
      "identity mismatch",
    ],
    [
      "broken character reference",
      (d) => {
        d.characterSpec.sha256 = "0".repeat(64);
      },
      "hash changed",
    ],
    [
      "template version mismatch",
      (d) => {
        d.template.templateVersion = "2.0.0" as never;
      },
      "constant",
    ],
    [
      "pending with coordinates",
      (d) => {
        d.neutralPelvisReference.position = { x: 160, y: 200 };
      },
      "pending pelvis",
    ],
    [
      "specified without evidence",
      (d) => {
        d.neutralPelvisReference.status = "specified";
        d.neutralPelvisReference.position = { x: 160, y: 200 };
      },
      "evidence",
    ],
    [
      "specified missing position",
      (d) => {
        d.neutralPelvisReference.status = "specified";
      },
      "inside the P04 frame",
    ],
    [
      "outside frame",
      (d) => {
        d.neutralPelvisReference.status = "specified";
        d.neutralPelvisReference.position = { x: geometry.frame.width, y: 200 };
      },
      "inside the P04 frame",
    ],
    [
      "production-ready claim",
      (d) => {
        d.status = "production-ready" as never;
      },
      "constant",
    ],
    [
      "ad hoc transform",
      (d) => {
        Object.assign(d, { bodyRoot: { x: 0, y: 0 } });
      },
      "additional properties",
    ],
  ];
  it.each(invalid)("rejects %s", (_name, mutate, message) => {
    const data = fixture();
    mutate(data);
    expect(
      validateMovementTemplateInstance(data, resolver).errors.join("\n"),
    ).toContain(message);
  });

  it("validates specified pelvis only as a synthetic schema example, never production approval", () => {
    // Synthetic coordinate/evidence values, never written as a real character measurement.
    const data = fixture();
    data.neutralPelvisReference = {
      status: "specified",
      coordinateSpace: "canonical-frame-pixels",
      position: { x: 160, y: 200 },
      evidence: {
        path: "tests/synthetic-pelvis-evidence.json",
        sha256: "a".repeat(64),
      },
    };
    const syntheticResolver = {
      ...resolver,
      sha256: (p: string) =>
        p === "tests/synthetic-pelvis-evidence.json"
          ? "a".repeat(64)
          : resolver.sha256(p),
    };
    const report = validateMovementTemplateInstance(data, syntheticResolver);
    expect(report.errors).toEqual([]);
    expect(report.productionReady).toBe(false);
  });
});
