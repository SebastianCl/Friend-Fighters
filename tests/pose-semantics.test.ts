import { describe, expect, it } from "vitest";
import catalogue from "../docs/characters/pose-semantics.json";
import engineMap from "../docs/characters/laura/engine-map.json";
import {
  createUnmeasuredPoseDraft,
  landmarkNames,
  validatePoseMasterDraft,
  type PoseMasterDraft,
} from "../docs/characters/pose-master-contract";

const approvedLabels = [
  "Guardia neutral A",
  "Guardia neutral B",
  "Guardia neutral C — reserva",
  "Marcha A",
  "Marcha B",
  "Marcha C — reserva",
  "Salto recogido",
  "Agachado abierto",
  "Alcance bajo — reserva",
  "Guardia agachada",
  "Defensa de antebrazo",
  "Guardia alta unilateral — reserva",
  "Reacción de impacto",
  "Derribo tumbado boca arriba",
  "Guardia neutral D",
  "Puñetazo recto de pie",
  "Preparación de patada con rodilla elevada",
  "Patada alta de pie",
  "Puñetazo agachado",
  "Patada baja con apoyo de mano",
  "Empuje de palmas de pie",
  "Rodillazo aéreo",
  "Patada aérea extendida",
  "Empuje de palmas agachado",
];
const ids = approvedLabels.map(
  (_, i) => "base_" + String(i + 1).padStart(2, "0"),
);
const validate = (draft: PoseMasterDraft) =>
  validatePoseMasterDraft(draft, ids);

describe("P03: catálogo artístico aprobado", () => {
  it("conserva exactamente los 24 IDs, etiquetas y reservas aprobados", () => {
    expect(catalogue.status).toBe("approved");
    expect(catalogue.meaning).toBe("artistic-semantics-only");
    expect(catalogue.poses.map((pose) => pose.resourceId)).toEqual(ids);
    expect(new Set(catalogue.poses.map((pose) => pose.resourceId)).size).toBe(
      24,
    );
    expect(catalogue.poses.map((pose) => pose.label)).toEqual(approvedLabels);
    expect(
      catalogue.poses
        .filter((pose) => pose.reserve)
        .map((pose) => pose.resourceId),
    ).toEqual(["base_03", "base_06", "base_09", "base_12"]);
  });

  it("vincula arte y motor por ID sin copiar claves del motor al catálogo", () => {
    expect(engineMap.artisticCatalog).toBe(
      "docs/characters/pose-semantics.json",
    );
    for (const pose of catalogue.poses) {
      expect(Object.keys(pose).sort()).toEqual([
        "label",
        "reserve",
        "resourceId",
      ]);
      const usage = engineMap.resources.find((r) => r.id === pose.resourceId);
      expect(usage).toBeDefined();
      expect(usage!.category).toBe("base");
      expect(Object.keys(usage!)).not.toContain("label");
      if (pose.reserve) {
        expect(usage!.engineKeys).toEqual([]);
        expect(usage!.used).toBe(false);
      }
    }
    // Artistic approval must not silently remap these known discordances.
    const keys = (id: string) =>
      engineMap.resources.find((r) => r.id === id)!.engineKeys;
    expect(keys("base_08")).toEqual(["land"]);
    expect(keys("base_14")).toEqual(["fall"]);
    expect(keys("base_15")).toEqual(["punch-wind", "special-wind"]);
    expect(keys("base_21")).toEqual(["special-hit"]);
    expect(keys("base_22")).toEqual(["air-punch"]);
    expect(keys("base_24")).toEqual(["low-special"]);
  });
});

describe("P03: contrato conceptual de landmarks", () => {
  it("permite borradores de las 24 poses sin inventar mediciones ni apoyos", () => {
    for (const id of ids) {
      const draft = createUnmeasuredPoseDraft(id);
      expect(validate(draft)).toEqual([]);
      expect(draft.coordinateSpace).toBeNull();
      expect(draft.groundContacts).toBeNull();
      expect(draft.attributes.airborne).toBeNull();
      expect(draft.attributes.supportLeg).toBeNull();
      expect(draft.attributes.hands).toEqual({ left: null, right: null });
      expect(draft.attributes.lateralityConfirmed).toBe(false);
      expect(Object.keys(draft.landmarks)).toEqual([...landmarkNames]);
      expect(
        Object.values(draft.landmarks).every((p) => p.position === null),
      ).toBe(true);
    }
  });

  it("detecta referencias inexistentes y articulaciones ausentes", () => {
    const draft = createUnmeasuredPoseDraft("base_25");
    expect(validate(draft)).toContain("unknown resource");
    Reflect.deleteProperty(draft.landmarks, "left_knee");
    expect(validate(draft)).toContain("missing landmark: left_knee");
    Object.assign(draft.landmarks, {
      screen_left_knee: { position: null, visibility: "unreviewed" },
    });
    expect(validate(draft)).toContain("unknown landmark: screen_left_knee");
  });

  it("exige una referencia para coordenadas y rechaza valores inválidos u ocultos", () => {
    // Synthetic annotation fixture; these numbers are not measurements of any asset.
    const draft = createUnmeasuredPoseDraft("base_01");
    draft.landmarks.head_center = {
      position: { x: 1, y: 1 },
      visibility: "visible",
    };
    expect(validate(draft)).toContain(
      "position without coordinate space: head_center",
    );
    draft.coordinateSpace = {
      imagePath: "synthetic-fixture.png",
      width: 4,
      height: 4,
      units: "pixels",
      origin: "top-left",
    };
    expect(validate(draft)).toEqual([]);
    draft.landmarks.head_center.visibility = "occluded";
    expect(validate(draft)).toContain(
      "unobserved landmark has coordinates: head_center",
    );
    draft.landmarks.head_center.visibility = "visible";
    for (const x of [-1, 4, Infinity, NaN]) {
      draft.landmarks.head_center.position = { x, y: 1 };
      expect(validate(draft)).toContain("invalid position: head_center");
    }
    draft.landmarks.head_center.position = null;
    draft.coordinateSpace.width = 0;
    expect(validate(draft)).toContain("invalid coordinate space");
  });

  it("distingue ausencia de contactos, contactos pendientes y apoyos corporales", () => {
    const draft = createUnmeasuredPoseDraft("base_22");
    draft.attributes.airborne = true;
    expect(validate(draft)).toContain(
      "airborne requires no ground contacts and no support leg",
    );
    draft.attributes.supportLeg = "none";
    draft.groundContacts = [];
    expect(validate(draft)).toEqual([]);
    draft.groundContacts = [
      { site: "left_palm", position: null, supportsWeight: true },
    ];
    expect(validate(draft)).toContain(
      "airborne requires no ground contacts and no support leg",
    );

    const lying = createUnmeasuredPoseDraft("base_14");
    lying.attributes.airborne = false;
    lying.attributes.supportLeg = "none";
    lying.groundContacts = [
      { site: "back", position: null, supportsWeight: true },
    ];
    expect(validate(lying)).toEqual([]);
    lying.groundContacts = [];
    expect(validate(lying)).toContain(
      "grounded pose cannot declare zero ground contacts",
    );
  });

  it("valida lateralidad, apoyos de pie o rodilla y contactos duplicados", () => {
    const draft = createUnmeasuredPoseDraft("base_20");
    draft.attributes.supportLeg = "left";
    draft.groundContacts = [
      { site: "left_knee", position: null, supportsWeight: true },
      { site: "right_palm", position: null, supportsWeight: true },
    ];
    expect(validate(draft)).toContain(
      "support leg requires confirmed anatomical laterality",
    );
    draft.attributes.lateralityConfirmed = true;
    expect(validate(draft)).toEqual([]);
    draft.attributes.supportLeg = "right";
    expect(validate(draft)).toContain(
      "support leg disagrees with leg contacts",
    );
    // Unknown weight on the other leg must not hide a confirmed contradiction.
    draft.groundContacts.push({
      site: "right_foot",
      position: null,
      supportsWeight: null,
    });
    expect(validate(draft)).toContain(
      "support leg disagrees with leg contacts",
    );
    draft.groundContacts.push({ ...draft.groundContacts[0] });
    expect(validate(draft)).toContain("duplicate contact site: left_knee");
  });
});
