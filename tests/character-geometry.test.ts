import { describe, expect, it } from "vitest";
import {
  geometryProfile as profile,
  sourceToCanonical,
  canonicalToActorLocal,
  actorLocalToWorld,
  worldToScene,
  sceneToScreen,
  mirrorCanonicalPoint,
  projectPoseAnnotations,
  mirrorCanonicalAnnotations,
  measureAlpha,
  validateCanonicalGeometry,
  validateScenePlacement,
} from "../docs/characters/geometry-contract";
import { createUnmeasuredPoseDraft } from "../docs/characters/pose-master-contract";

// All annotation coordinates below are synthetic fixtures, NOT Laura measurements.
function annotations() {
  const draft = createUnmeasuredPoseDraft("base_01");
  draft.coordinateSpace = {
    imagePath: "synthetic.png",
    width: 640,
    height: 704,
    units: "pixels",
    origin: "top-left",
  };
  draft.landmarks.left_wrist = {
    position: { x: 240, y: 300 },
    visibility: "visible",
  };
  draft.attributes = {
    facing: "right",
    laterality: "anatomical",
    lateralityConfirmed: true,
    hands: { left: "open", right: "fist" },
    supportLeg: "left",
    airborne: false,
  };
  draft.groundContacts = [
    { site: "left_foot", position: { x: 260, y: 656 }, supportsWeight: true },
  ];
  return projectPoseAnnotations(draft, {
    sourceOrigin: { x: 0, y: 0 },
    uniformScale: 0.5,
    translation: { x: 0, y: 0 },
  });
}
function frame() {
  return {
    width: 320,
    height: 352,
    pivot: { x: 160, y: 328 },
    alpha: {
      gt0: { count: 2, bounds: { left: 8, top: 8, right: 312, bottom: 344 } },
      gt128: {
        count: 1,
        bounds: { left: 100, top: 100, right: 101, bottom: 101 },
      },
    },
  };
}

describe("P04: perfil geométrico aprobado", () => {
  it("fija geometría, políticas y tolerancias sin definir estaturas ni integración", () => {
    expect(profile.frame).toEqual({ width: 320, height: 352, units: "pixels" });
    expect(profile.pivot).toEqual({ x: 160, y: 328 });
    expect(profile.nominalGroundY).toBe(328);
    expect(profile.gameUnitsPerCanonicalPixel).toBe(0.75);
    expect(profile.status).toBe("approved");
    expect(profile.scope).toBe("character-pipeline-only");
    expect(profile.runtimeIntegrationTicket).toBe("P15");
    expect(profile.pivotMeaning).toBe("actor-local-origin");
    expect(profile.policies).toMatchObject({
      pivotFromAlpha: false,
      autoScaleToFit: false,
      overflow: "report-for-review",
      density: "shared-by-all-characters",
      statureAndProportions: "deferred-to-character-spec",
      mechanicalDimensions: "independent",
    });
    expect(profile.alpha).toEqual({
      preserve: "all-alpha-greater-than-zero",
      automaticCleanup: false,
      diagnosticThresholdsExclusive: [0, 128],
    });
    expect(profile.tolerances).toEqual({
      status: "provisional",
      contentMarginCanonicalPixels: 8,
      groundContactCanonicalPixels: 1,
      roundedPlacementScenePixels: 0.5,
      numericTransformScenePixels: 0.0001,
      mirror: "reversible-within-numeric-transform-tolerance",
      anatomicalProportionsPercent: null,
    });
  });

  it("recorre los espacios con signos correctos sin mutar la posición física", () => {
    const actor = Object.freeze({ x: 180, y: 50 });
    const canonical = sourceToCanonical(
      { x: 60, y: 100 },
      {
        sourceOrigin: { x: 20, y: 40 },
        uniformScale: 0.5,
        translation: { x: 160, y: 258 },
      },
    );
    expect(canonical).toEqual({ x: 180, y: 288 });
    const local = canonicalToActorLocal(canonical);
    expect(local).toEqual({ x: 15, y: 30 });
    expect(canonicalToActorLocal(profile.pivot)).toEqual({ x: 0, y: 0 });
    expect(actorLocalToWorld(local, actor, -1)).toEqual({ x: 165, y: 80 });
    const scene = worldToScene(
      actorLocalToWorld(local, actor, 1),
      { x: 0, y: 612 },
      2,
    );
    expect(scene).toEqual({ x: 390, y: 452 });
    expect(sceneToScreen(scene, { x: 10, y: 20 }, 0.5)).toEqual({
      x: 205,
      y: 246,
    });
    expect(actor).toEqual({ x: 180, y: 50 });
  });

  it("rechaza escalas y coordenadas inválidas sin inventar valores por defecto", () => {
    for (const scale of [0, -1, NaN, Infinity])
      expect(() =>
        sourceToCanonical(
          { x: 1, y: 2 },
          {
            sourceOrigin: { x: 0, y: 0 },
            uniformScale: scale,
            translation: { x: 0, y: 0 },
          },
        ),
      ).toThrow("invalid scale");
    expect(() => canonicalToActorLocal({ x: NaN, y: 0 })).toThrow(
      "non-finite point",
    );
    expect(() =>
      projectPoseAnnotations(createUnmeasuredPoseDraft("base_01"), {
        sourceOrigin: { x: 0, y: 0 },
        uniformScale: 1,
        translation: { x: 0, y: 0 },
      }),
    ).toThrow("source image required");
  });

  it("mantiene coordenadas desconocidas y procedencia de P03", () => {
    const a = annotations();
    expect(a.landmarks.left_wrist.position).toEqual({ x: 120, y: 150 });
    expect(a.landmarks.right_wrist.position).toBeNull();
    expect(a.sourceSpace?.width).toBe(640);
    expect(a.sourceTransform).toEqual({
      sourceOrigin: { x: 0, y: 0 },
      uniformScale: 0.5,
      translation: { x: 0, y: 0 },
    });
    expect(a.interactionPoints).toEqual({});
    const review = validateCanonicalGeometry({ ...frame(), annotations: a });
    expect(review.errors).toEqual([]);
    expect(review.pending).toContain("unmeasured: right_wrist");
  });

  it("refleja coordenadas y orientación sin intercambiar lateralidad, manos o apoyos", () => {
    const a = annotations();
    a.interactionPoints.visual_grip = { x: 220, y: 200 };
    a.interactionPoints.unmeasured = null;
    const original = structuredClone(a),
      reflected = mirrorCanonicalAnnotations(a);
    expect(reflected.landmarks.left_wrist.position).toEqual({ x: 200, y: 150 });
    expect(reflected.landmarks.right_wrist.position).toBeNull();
    expect(reflected.groundContacts![0]).toEqual({
      site: "left_foot",
      position: { x: 190, y: 328 },
      supportsWeight: true,
    });
    expect(reflected.attributes.supportLeg).toBe("left");
    expect(reflected.attributes.hands).toEqual(a.attributes.hands);
    expect(reflected.attributes.facing).toBe("left");
    expect(reflected.interactionPoints.visual_grip).toEqual({ x: 100, y: 200 });
    expect(mirrorCanonicalAnnotations(reflected)).toEqual(a);
    expect(a).toEqual(original);
    for (const point of [
      { x: 0.125, y: 17 },
      { x: 123.456789, y: 200 },
      profile.pivot,
    ]) {
      const twice = mirrorCanonicalPoint(mirrorCanonicalPoint(point));
      const deltaScene = Math.abs(twice.x - point.x) * 0.75 * 2;
      expect(deltaScene).toBeLessThanOrEqual(
        profile.tolerances.numericTransformScenePixels,
      );
    }
  });

  it("registra ambos umbrales, incluyendo alfa 1 y 128 sin alterar el buffer", () => {
    const rgba = new Uint8Array(5 * 4);
    [0, 1, 128, 129, 255].forEach((alpha, i) => {
      rgba[i * 4 + 3] = alpha;
    });
    const original = rgba.slice();
    expect(measureAlpha(rgba, 5, 1)).toEqual({
      gt0: { count: 4, bounds: { left: 1, top: 0, right: 5, bottom: 1 } },
      gt128: { count: 2, bounds: { left: 3, top: 0, right: 5, bottom: 1 } },
    });
    expect(rgba).toEqual(original);
    expect(() => measureAlpha(rgba, 4, 1)).toThrow("invalid RGBA dimensions");
    expect(measureAlpha(new Uint8Array(4), 1, 1).gt0).toEqual({
      count: 0,
      bounds: null,
    });
  });

  it("usa todo alfa para margen y reporta desbordamiento sin cambiar escala ni pivote", () => {
    const f = frame();
    expect(validateCanonicalGeometry(f).errors).toEqual([]);
    f.alpha.gt0.bounds.left = 7; // Even a translucent fringe must be reported.
    const original = structuredClone(f);
    expect(validateCanonicalGeometry(f).errors.join()).toContain(
      "content margin below 8",
    );
    expect(f).toEqual(original);
    f.alpha.gt0.bounds.right = 321;
    expect(validateCanonicalGeometry(f).errors).toContain(
      "invalid alpha extent: gt0",
    );
    expect(
      validateCanonicalGeometry({ ...frame(), width: 300 }).errors,
    ).toContain("wrong canonical dimensions");
    expect(
      validateCanonicalGeometry({ ...frame(), pivot: { x: 160, y: 327 } })
        .errors,
    ).toContain("wrong canonical pivot");
    const onlyTranslucent = {
      ...frame(),
      alpha: { gt0: frame().alpha.gt0, gt128: { count: 0, bounds: null } },
    };
    expect(validateCanonicalGeometry(onlyTranslucent).errors).toEqual([]);
    const badCounts = frame();
    badCounts.alpha.gt128.count = 3;
    expect(validateCanonicalGeometry(badCounts).errors).toContain(
      "inconsistent alpha thresholds",
    );
  });

  it("aplica la tolerancia de suelo a apoyos de pie, rodilla, mano y cuerpo", () => {
    for (const site of [
      "left_foot",
      "left_knee",
      "left_palm",
      "back",
      "pelvis",
    ] as const) {
      const a = annotations();
      a.groundContacts = [
        { site, position: { x: 130, y: 329 }, supportsWeight: true },
      ];
      expect(
        validateCanonicalGeometry({ ...frame(), annotations: a }).errors,
      ).toEqual([]);
      a.groundContacts[0].position!.y = 329.01;
      expect(
        validateCanonicalGeometry({ ...frame(), annotations: a }).errors,
      ).toContain("contact outside ground tolerance: " + site);
    }
  });

  it("distingue aire, suelo y datos pendientes sin alinear la silueta ni inventar contactos", () => {
    const a = annotations();
    a.attributes.airborne = true;
    a.attributes.supportLeg = "none";
    a.groundContacts = [];
    const f = { ...frame(), annotations: a };
    f.alpha.gt0.bounds.bottom = 280; // Floating silhouette: no automatic floor alignment.
    expect(validateCanonicalGeometry(f).errors).toEqual([]);
    a.groundContacts = [
      { site: "left_foot", position: null, supportsWeight: null },
    ];
    expect(validateCanonicalGeometry(f).errors).toContain(
      "airborne pose must have no contacts or supporting leg",
    );
    a.attributes.airborne = null;
    a.groundContacts = null;
    expect(validateCanonicalGeometry(f).pending).toContain(
      "contacts unresolved",
    );
    a.attributes.airborne = false;
    a.groundContacts = [];
    expect(validateCanonicalGeometry(f).errors).toContain(
      "grounded pose needs declared contacts",
    );
  });

  it("distingue error numérico antes del redondeo y colocación final", () => {
    expect(
      validateScenePlacement(
        { x: 0.5, y: 10 },
        { x: 0.5, y: 10 },
        { x: 1, y: 10 },
      ),
    ).toEqual([]);
    expect(
      validateScenePlacement(
        { x: 0, y: 10 },
        { x: 0.0001, y: 10 },
        { x: 0, y: 10 },
      ),
    ).toEqual([]);
    expect(
      validateScenePlacement(
        { x: 0, y: 10 },
        { x: 0.00011, y: 10 },
        { x: 0, y: 10 },
      ),
    ).toContain("numeric transform tolerance exceeded: x");
    expect(
      validateScenePlacement(
        { x: 0.499, y: 10 },
        { x: 0.499, y: 10 },
        { x: 1, y: 10 },
      ),
    ).toContain("rounded placement tolerance exceeded: x");
    expect(
      validateScenePlacement({ x: NaN, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
    ).toContain("non-finite scene placement");
  });
});
