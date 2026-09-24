// P03 authoring contract. This module is not imported by the game.
// Draft validity checks consistency only; it does not approve a production template.
export const landmarkNames = [
  "head_center",
  "neck",
  "sternum",
  "pelvis_center",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_palm",
  "right_palm",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_toe",
  "right_toe",
] as const;

export const contactSites = [
  "left_foot",
  "right_foot",
  "left_knee",
  "right_knee",
  "left_palm",
  "right_palm",
  "back",
  "pelvis",
  "head",
] as const;

type Point = { x: number; y: number };
type HandState = "open" | "fist" | "relaxed" | null;
type SupportLeg = "left" | "right" | "both" | "none" | null;
export interface PoseMasterDraft {
  resourceId: string;
  status: "draft";
  // Coordinates refer to an explicitly identified image, never a runtime pivot.
  coordinateSpace: {
    imagePath: string;
    width: number;
    height: number;
    units: "pixels";
    origin: "top-left";
  } | null;
  landmarks: Record<
    (typeof landmarkNames)[number],
    {
      position: Point | null;
      visibility: "unreviewed" | "visible" | "occluded";
    }
  >;
  attributes: {
    facing: "left" | "right" | null;
    laterality: "anatomical";
    lateralityConfirmed: boolean;
    hands: { left: HandState; right: HandState };
    supportLeg: SupportLeg;
    airborne: boolean | null;
  };
  // null = not reviewed; [] = reviewed and no ground contact.
  groundContacts:
    | {
        site: (typeof contactSites)[number];
        position: Point | null;
        supportsWeight: boolean | null;
      }[]
    | null;
}

export function createUnmeasuredPoseDraft(resourceId: string): PoseMasterDraft {
  return {
    resourceId,
    status: "draft",
    coordinateSpace: null,
    landmarks: Object.fromEntries(
      landmarkNames.map((name) => [
        name,
        { position: null, visibility: "unreviewed" },
      ]),
    ) as PoseMasterDraft["landmarks"],
    attributes: {
      facing: null,
      laterality: "anatomical",
      lateralityConfirmed: false,
      hands: { left: null, right: null },
      supportLeg: null,
      airborne: null,
    },
    groundContacts: null,
  };
}

export function validatePoseMasterDraft(
  draft: PoseMasterDraft,
  resourceIds: readonly string[],
): string[] {
  const errors: string[] = [];
  if (!resourceIds.includes(draft.resourceId)) errors.push("unknown resource");
  if (draft.status !== "draft")
    errors.push("only draft validation is supported");

  const space = draft.coordinateSpace;
  if (
    space !== null &&
    (!space.imagePath.trim() ||
      !Number.isInteger(space.width) ||
      space.width <= 0 ||
      !Number.isInteger(space.height) ||
      space.height <= 0 ||
      space.units !== "pixels" ||
      space.origin !== "top-left")
  )
    errors.push("invalid coordinate space");

  const checkPosition = (point: Point | null, name: string) => {
    if (point === null) return;
    if (space === null) {
      errors.push("position without coordinate space: " + name);
      return;
    }
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x >= space.width ||
      point.y >= space.height
    )
      errors.push("invalid position: " + name);
  };

  for (const name of landmarkNames) {
    const landmark = draft.landmarks[name];
    if (!landmark) {
      errors.push("missing landmark: " + name);
      continue;
    }
    if (!["unreviewed", "visible", "occluded"].includes(landmark.visibility))
      errors.push("invalid visibility: " + name);
    if (landmark.position !== null && landmark.visibility !== "visible")
      errors.push("unobserved landmark has coordinates: " + name);
    checkPosition(landmark.position, name);
  }
  for (const name of Object.keys(draft.landmarks))
    if (!(landmarkNames as readonly string[]).includes(name))
      errors.push("unknown landmark: " + name);

  const a = draft.attributes;
  if (!["left", "right", null].includes(a.facing))
    errors.push("invalid facing");
  if (
    a.laterality !== "anatomical" ||
    typeof a.lateralityConfirmed !== "boolean"
  )
    errors.push("invalid anatomical laterality");
  for (const side of ["left", "right"] as const)
    if (!["open", "fist", "relaxed", null].includes(a.hands[side]))
      errors.push("invalid hand state: " + side);
  if (!["left", "right", "both", "none", null].includes(a.supportLeg))
    errors.push("invalid support leg");
  if (![true, false, null].includes(a.airborne))
    errors.push("invalid airborne");
  if (
    ["left", "right", "both"].includes(a.supportLeg ?? "") &&
    !a.lateralityConfirmed
  )
    errors.push("support leg requires confirmed anatomical laterality");

  const sites = new Set<string>();
  for (const contact of draft.groundContacts ?? []) {
    if (!(contactSites as readonly string[]).includes(contact.site))
      errors.push("unknown contact site: " + contact.site);
    if (sites.has(contact.site))
      errors.push("duplicate contact site: " + contact.site);
    sites.add(contact.site);
    if (![true, false, null].includes(contact.supportsWeight))
      errors.push("invalid support weight: " + contact.site);
    checkPosition(contact.position, contact.site);
  }
  if (
    a.airborne === true &&
    (draft.groundContacts === null ||
      draft.groundContacts.length !== 0 ||
      a.supportLeg !== "none")
  )
    errors.push("airborne requires no ground contacts and no support leg");
  if (a.airborne === false && draft.groundContacts?.length === 0)
    errors.push("grounded pose cannot declare zero ground contacts");

  if (draft.groundContacts !== null && a.supportLeg !== null) {
    const legSide = (site: string) =>
      site === "left_foot" || site === "left_knee"
        ? "left"
        : site === "right_foot" || site === "right_knee"
          ? "right"
          : null;
    const bearingLegs = [
      ...new Set(
        draft.groundContacts
          .filter((c) => c.supportsWeight === true && legSide(c.site) !== null)
          .map((c) => legSide(c.site)),
      ),
    ].sort();
    const expectedLegs: ("left" | "right")[] =
      a.supportLeg === "both"
        ? ["left", "right"]
        : a.supportLeg === "none"
          ? []
          : [a.supportLeg];
    const unknownLegs = draft.groundContacts
      .filter((c) => legSide(c.site) !== null && c.supportsWeight === null)
      .map((c) => legSide(c.site));
    if (
      bearingLegs.some((side) => !expectedLegs.includes(side!)) ||
      expectedLegs.some(
        (side) => !bearingLegs.includes(side) && !unknownLegs.includes(side),
      )
    )
      errors.push("support leg disagrees with leg contacts");
  }
  return errors;
}
