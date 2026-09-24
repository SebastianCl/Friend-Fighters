import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import global from "../docs/characters/pipeline-config.json";
import inventory from "../docs/characters/source-inventory.json";
import semantics from "../docs/characters/pose-semantics.json";
import geometry from "../docs/characters/geometry-profile.json";
import frameSchema from "../docs/characters/schemas/frame.schema.json";
import engineMap from "../docs/characters/laura/engine-map.json";
import {
  contactSites,
  createUnmeasuredPoseDraft,
  landmarkNames,
} from "../docs/characters/pose-master-contract";
import {
  validateCharacterPackage,
  validatePipelineConfiguration,
  type ConfigResolver,
} from "../docs/characters/config-contract";

// Synthetic schema fixtures. Values below are never measurements or specs of a real character.
const syntheticId = "fixture-actor";
const sourceBase = "public/art/characters/laura/source-sheet.jpg";
const sourceGrab = "public/art/characters/laura/grab-sheet.png";
const sourceMaster = "public/art/characters/laura/guard.png";
const ids = [
  ...semantics.poses.map((pose) => pose.resourceId),
  ...global.grabResourceIds,
];
const outputHash = "a".repeat(64);
const documents = () =>
  new Map<string, unknown>([
    [global.sourceInventory.path, inventory],
    [global.poseSemantics.path, semantics],
    [global.geometryProfile.path, geometry],
  ]);
const fixture = () => {
  const docs = documents();
  const hashes = new Map(
    inventory.files.map((entry) => [entry.path, entry.sha256]),
  );
  for (const reference of [
    global.sourceInventory,
    global.poseSemantics,
    global.geometryProfile,
  ])
    hashes.set(
      reference.path,
      createHash("sha256").update(readFileSync(reference.path)).digest("hex"),
    );
  const resolver: ConfigResolver = {
    readJson: (path) => docs.get(path),
    sha256: (path) =>
      hashes.get(path) ??
      (path.startsWith("tests/synthetic-output/") ? outputHash : null),
  };
  const spec = {
    schemaVersion: 1,
    pipelineVersion: global.pipelineVersion,
    geometryProfileId: geometry.id,
    status: "draft",
    identity: { id: syntheticId, displayName: null, revision: 1 },
    review: { status: "pending", reviewedBy: null },
    sources: [
      { path: sourceBase, role: "design" },
      { path: sourceGrab, role: "legacy" },
      { path: sourceMaster, role: "master" },
    ],
    visual: {
      designReferencePath: null,
      masterReferencePath: null,
      statureGameUnits: null,
      proportions: null,
      appearanceNotes: null,
    },
    resources: [{ id: "base_01", status: "pending", framePath: null }] as {
      id: string;
      status: string;
      framePath: string | null;
    }[],
  };
  function frame(id: string, approved = false) {
    const sourcePath = id.startsWith("grab_") ? sourceGrab : sourceBase;
    const source = inventory.files.find((entry) => entry.path === sourcePath)!;
    const poseDraft = createUnmeasuredPoseDraft(id);
    poseDraft.coordinateSpace = {
      imagePath: sourcePath,
      width: source.width,
      height: source.height,
      units: "pixels",
      origin: "top-left",
    };
    poseDraft.attributes.facing = "right";
    poseDraft.attributes.lateralityConfirmed = true;
    poseDraft.attributes.hands = { left: "open", right: "fist" };
    const airborne = ["base_07", "base_22", "base_23"].includes(id);
    poseDraft.attributes.airborne = airborne;
    poseDraft.attributes.supportLeg =
      airborne || id === "base_14" ? "none" : "left";
    poseDraft.groundContacts = airborne
      ? []
      : [
          {
            site: id === "base_14" ? "back" : "left_foot",
            position: { x: 160, y: 328 },
            supportsWeight: true,
          },
        ];
    if (approved)
      for (const landmark of Object.values(poseDraft.landmarks)) {
        landmark.visibility = "visible";
        landmark.position = { x: 160, y: 200 };
      }
    const path = `tests/synthetic-frames/${id}.json`;
    const value = {
      schemaVersion: 1,
      pipelineVersion: global.pipelineVersion,
      geometryProfileId: geometry.id,
      characterId: syntheticId,
      resourceId: id,
      status: approved ? "approved" : "draft",
      review: {
        status: approved ? "approved" : "pending",
        reviewedBy: approved ? "fixture-reviewer" : null,
      },
      sourcePath,
      sourceTransform: {
        sourceOrigin: { x: 0, y: 0 },
        uniformScale: 1,
        translation: { x: 0, y: 0 },
      },
      poseDraft,
      canonical: {
        width: 320,
        height: 352,
        pivot: { x: 160, y: 328 },
        alpha: approved
          ? {
              gt0: {
                count: 102144,
                bounds: { left: 8, top: 8, right: 312, bottom: 344 },
              },
              gt128: {
                count: 100000,
                bounds: { left: 8, top: 8, right: 312, bottom: 344 },
              },
            }
          : null,
        interactionPoints: {},
      },
      output: approved
        ? { path: `tests/synthetic-output/${id}.png`, sha256: outputHash }
        : null,
    };
    docs.set(path, value);
    return { path, value };
  }
  function ready() {
    spec.status = "production-ready";
    spec.identity.displayName = "Synthetic Actor";
    spec.review = { status: "approved", reviewedBy: "fixture-reviewer" };
    spec.visual = {
      designReferencePath: sourceBase,
      masterReferencePath: sourceMaster,
      statureGameUnits: 210,
      proportions: { headToBody: 0.14 },
      appearanceNotes: "Synthetic fixture",
    };
    spec.resources = ids.map((id) => ({
      id,
      status: "approved",
      framePath: frame(id, true).path,
    }));
  }
  return { docs, hashes, resolver, spec, frame, ready };
};
const validate = (
  f: ReturnType<typeof fixture>,
  mode: "draft" | "production" = "draft",
  integration?: unknown,
) => validateCharacterPackage(global, f.spec, f.resolver, mode, integration);

// Produces failures without depending on a particular error ordering.
const errorsFor = (
  change: (f: ReturnType<typeof fixture>) => void,
  mode: "draft" | "production" = "draft",
) => {
  const f = fixture();
  change(f);
  return validate(f, mode).errors.join(" | ");
};

describe("P05: configuration and versioned schemas", () => {
  it("keeps the structural landmark and contact vocabularies in sync with P03", () => {
    expect(frameSchema.$defs.pose.properties.landmarks.required).toEqual([
      ...landmarkNames,
    ]);
    expect(frameSchema.$defs.contact.properties.site.enum).toEqual([
      ...contactSites,
    ]);
  });
  it("loads P01/P03/P04 references without copying their catalogues", () => {
    const f = fixture();
    expect(validatePipelineConfiguration(global, f.resolver)).toEqual([]);
    expect(Object.keys(global).sort()).toEqual([
      "geometryProfile",
      "grabResourceIds",
      "pipelineVersion",
      "poseSemantics",
      "schemaVersion",
      "sourceInventory",
    ]);
  });

  it("allows incomplete drafts and rejects them for production", () => {
    const f = fixture();
    expect(validate(f).errors).toEqual([]);
    expect(validate(f).productionReady).toBe(false);
    expect(validate(f).pending).toContain("character: stature not measured");
    expect(validate(f, "production").errors.join()).toContain(
      "production pending",
    );
    expect(validate(f, "production").productionReady).toBe(false);
  });

  it("can validate a fully specified synthetic package independently of engine integration", () => {
    const f = fixture();
    f.ready();
    const report = validate(f, "production");
    expect(report).toEqual({ errors: [], pending: [], productionReady: true });
    expect(f.spec.resources).toHaveLength(27);
  });

  it("rejects incompatible global, character, frame and integration versions", () => {
    const f = fixture();
    expect(
      validatePipelineConfiguration(
        { ...global, schemaVersion: 2 },
        f.resolver,
      ).join(),
    ).toContain("global/schemaVersion");
    expect(
      validatePipelineConfiguration(
        { ...global, pipelineVersion: "2.0.0" },
        f.resolver,
      ).join(),
    ).toContain("global/pipelineVersion");
    expect(
      validatePipelineConfiguration(
        {
          ...global,
          geometryProfile: { ...global.geometryProfile, id: "wrong" },
        },
        f.resolver,
      ).join(),
    ).toContain("incompatible geometry profile ID");
    expect(
      errorsFor((x) => {
        x.spec.pipelineVersion = "1.0.0";
      }),
    ).toContain("incompatible pipeline/profile version");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.geometryProfileId = "other";
      }),
    ).toContain("incompatible pipeline/profile version");
    const integration = {
      schemaVersion: 1,
      pipelineVersion: "2.0.0",
      characterId: syntheticId,
      status: "pending",
      engineMapPath: null,
      engineMapSchemaVersion: 1,
    };
    expect(validate(f, "draft", integration).errors.join()).toContain(
      "integration: version/character mismatch",
    );
  });

  it("rejects duplicates and unknown resource IDs", () => {
    expect(
      errorsFor((x) => {
        x.spec.resources.push({ ...x.spec.resources[0] });
      }),
    ).toContain("duplicate ID base_01");
    expect(
      errorsFor((x) => {
        x.spec.resources[0].id = "base_25";
      }),
    ).toContain("unknown resource ID base_25");
    expect(
      errorsFor((x) => {
        x.spec.sources.push({ path: sourceBase, role: "design" });
      }),
    ).toContain("duplicate items");
    const f = fixture();
    expect(
      validatePipelineConfiguration(
        { ...global, grabResourceIds: ["grab_01", "grab_01", "grab_03"] },
        f.resolver,
      ).join(),
    ).toContain("duplicate items");
  });

  it("rejects broken references, hashes and source coordinate spaces", () => {
    const f = fixture();
    expect(
      validatePipelineConfiguration(
        {
          ...global,
          sourceInventory: { ...global.sourceInventory, path: "missing.json" },
        },
        f.resolver,
      ).join(),
    ).toContain("broken or incompatible P01");
    expect(
      validatePipelineConfiguration(
        {
          ...global,
          poseSemantics: { ...global.poseSemantics, path: "missing.json" },
        },
        f.resolver,
      ).join(),
    ).toContain("broken or changed P03");
    expect(
      validatePipelineConfiguration(
        {
          ...global,
          geometryProfile: { ...global.geometryProfile, path: "missing.json" },
        },
        f.resolver,
      ).join(),
    ).toContain("broken or changed P04");
    expect(
      validatePipelineConfiguration(
        {
          ...global,
          geometryProfile: { ...global.geometryProfile, sha256: outputHash },
        },
        f.resolver,
      ).join(),
    ).toContain("changed P04 reference hash");
    expect(
      errorsFor((x) => {
        x.spec.sources[0].path = "missing.png";
      }),
    ).toContain("source absent from P01");
    expect(
      errorsFor((x) => {
        x.hashes.set(sourceBase, outputHash);
      }),
    ).toContain("hash differs from P01");
    expect(
      errorsFor((x) => {
        x.spec.resources[0].framePath = "missing-frame.json";
      }),
    ).toContain("frame base_01");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.poseDraft.coordinateSpace!.width = 100;
      }),
    ).toContain("source coordinate space differs from P01");
  });

  it("rejects missing mandatory fields and unknown approval flags", () => {
    expect(
      errorsFor((x) => {
        Reflect.deleteProperty(x.spec, "visual");
      }),
    ).toContain("required property 'visual'");
    expect(
      errorsFor((x) => {
        Object.assign(x.spec.resources[0], { pending: true, approved: true });
      }),
    ).toContain("additional properties");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        Reflect.deleteProperty(item.value.poseDraft.attributes.hands, "left");
      }),
    ).toContain("required property 'left'");
  });

  it("rejects contradictory approval states", () => {
    expect(
      errorsFor((x) => {
        x.spec.review = { status: "approved", reviewedBy: "reviewer" };
      }),
    ).toContain("status and review disagree");
    expect(
      errorsFor((x) => {
        x.spec.resources[0].status = "approved";
      }),
    ).toContain("approved resource missing frame");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.status = "approved";
      }),
    ).toContain("status and review disagree");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        x.spec.resources[0].status = "approved";
      }),
    ).toContain("resource/frame approval conflict");
  });

  it("reuses P03 for anatomical laterality and airborne/contact consistency", () => {
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        Object.assign(item.value.poseDraft.attributes, {
          laterality: "screen",
        });
      }),
    ).toContain("laterality");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.poseDraft.attributes.airborne = true;
      }),
    ).toContain("airborne requires no ground contacts");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.poseDraft.attributes.supportLeg = "right";
      }),
    ).toContain("support leg disagrees with leg contacts");
  });

  it("rejects invalid source transforms, pivots and coordinates outside canonical frame", () => {
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.sourceTransform.uniformScale = -1;
      }),
    ).toContain("sourceTransform/uniformScale");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.canonical.pivot.x = 159;
      }),
    ).toContain("wrong canonical pivot");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.poseDraft.landmarks.left_wrist = {
          position: { x: 900, y: 200 },
          visibility: "visible",
        };
      }),
    ).toContain("point outside canonical frame: left_wrist");
    expect(
      errorsFor((x) => {
        const item = x.frame("base_01");
        x.spec.resources[0].framePath = item.path;
        item.value.canonical.interactionPoints.visual_grip = { x: 321, y: 200 };
      }),
    ).toContain("point outside canonical frame: visual_grip");
  });

  it("blocks incomplete or unreviewed frames from production", () => {
    const f = fixture();
    f.ready();
    const item = f.docs.get(f.spec.resources[0].framePath!) as ReturnType<
      typeof f.frame
    >["value"];
    item.poseDraft.landmarks.left_wrist.position = null;
    expect(validate(f, "production").errors.join()).toContain(
      "approved frame has unmeasured annotations",
    );
    item.poseDraft.landmarks.left_wrist.visibility = "occluded";
    expect(validate(f, "production").errors).toEqual([]); // Occluded points remain unknown by P03.
    item.canonical.alpha = null;
    expect(validate(f, "production").errors.join()).toContain(
      "approved frame contains pending data",
    );
    item.canonical.alpha = {
      gt0: { count: 1, bounds: { left: 0, top: 0, right: 1, bottom: 1 } },
      gt128: { count: 1, bounds: { left: 0, top: 0, right: 1, bottom: 1 } },
    };
    expect(validate(f, "production").errors.join()).toContain(
      "content margin below 8",
    );
  });

  it("keeps engine integration independent and validates a verified map", () => {
    const f = fixture();
    const path = "tests/synthetic-engine-map.json";
    f.docs.set(path, { ...engineMap, character: syntheticId });
    const integration = {
      schemaVersion: 1,
      pipelineVersion: global.pipelineVersion,
      characterId: syntheticId,
      status: "verified",
      engineMapPath: path,
      engineMapSchemaVersion: 1,
    };
    expect(validate(f, "draft", integration).errors).toEqual([]);
    expect(
      validate(f, "draft", {
        ...integration,
        engineMapPath: "missing.json",
      }).errors.join(),
    ).toContain("broken or incompatible engine-map");
    expect(
      validate(f, "draft", {
        ...integration,
        status: "pending",
        engineMapPath: null,
      }).pending,
    ).toContain("integration pending for P15");
    const changed = structuredClone(f.docs.get(path)) as typeof engineMap;
    changed.resources[0].sourcePath = "missing.png";
    f.docs.set(path, changed);
    expect(validate(f, "draft", integration).errors.join()).toContain(
      "broken P01 source reference base_01",
    );
    changed.resources[0].sourcePath = sourceBase;
    changed.resources[0].id = "base_25";
    f.docs.set(path, changed);
    expect(validate(f, "draft", integration).errors.join()).toContain(
      "unknown resource base_25",
    );
  });
});
